import { Brackets } from 'typeorm';
import { SchemaField } from '../../../entities/SchemaField';
import { Schema } from '../../../entities/Schema';
import { Document } from '../../../entities/Document';

interface Where {
  gt?: any;
  gte?: any;
  lt?: any;
  lte?: any;
  eq?: any;
  in?: any;
  contains?: any;
}

export interface NestedWhere {
  [key: string]: undefined | Where | NestedWhere[];
  OR?: NestedWhere[];
  AND?: NestedWhere[];
}

const operators = {
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  eq: '=',
  in: 'IN',
  contains: 'LIKE',
  not: '!=',
};

const modes = { OR: 'orWhere', AND: 'andWhere' };

export const documentWhereBuilder = (
  tableName: string,
  fields: SchemaField[],
  schemas: Schema[],
  queryBuilder,
  where: Where | NestedWhere,
  scope: string[] = [],
  mode: string = 'andWhere'
) => {
  for (const [fieldName, whereOrValue] of Object.entries(where)) {
    if (fieldName === 'OR' || fieldName === 'AND') {
      queryBuilder[mode](
        new Brackets(builder => {
          whereOrValue.forEach(innerWhere =>
            documentWhereBuilder(
              tableName,
              fields,
              schemas,
              builder,
              innerWhere,
              scope,
              modes[fieldName]
            )
          );
          return builder;
        })
      );
    } else if (operators.hasOwnProperty(fieldName)) {
      const innerScope = ['"data"', ...scope.slice(0).map(n => `'${n}'`)];
      const lastScopeItem = innerScope.pop();
      const column = `"${tableName}".${innerScope.join('->')}->>${lastScopeItem}`;
      const operator = operators[fieldName];
      if (!operator) {
        continue;
      }
      let value = whereOrValue;
      if (fieldName === 'contains') {
        value = `%${value}%`;
      }
      const key = Buffer.from(value).toString('hex');
      queryBuilder[mode](`${column} ${operator} :${key}`, { [key]: value });
    } else if (whereOrValue) {
      const field = fields.find(
        targetField =>
          targetField.name === fieldName &&
          targetField.parentFieldId === (scope[scope.length - 1] || null)
      );
      if (field && field.type === 'document') {
        const schemaId = field.options.schemaId || field.options.schemaIds[0];

        const schema = schemas.find(schema => schema.id === schemaId);

        if (schema) {
          const sqb = queryBuilder
            .subQuery()
            .select(`concat("schemaId"::text, ',', "documentId"::text) as result`)
            .from(Document, 'f')
            .where(`"f"."schemaId" = :subSchemaId`, { subSchemaId: schema.id });

          documentWhereBuilder('f', schema.fields, schemas, sqb, whereOrValue);

          const column = `"${tableName}"."data"->>'${field.id}'`;
          queryBuilder[mode](`${column} IN (${sqb.getQuery()})`);
        }
      } else if (field && field.primeField) {
        const nextScope = [...scope, field.id];
        documentWhereBuilder(
          tableName,
          fields,
          schemas,
          queryBuilder,
          whereOrValue,
          nextScope,
          mode
        );
      }
    }
  }
};
