import {SSMClient, GetParameterCommand} from '@aws-sdk/client-ssm'
import * as t from 'io-ts';

export class ParameterException extends Error {}

const tParameter = t.type({
  notion: t.type({
    token: t.string,
    database_id: t.string
  })
});

type ParameterInput = t.TypeOf<typeof tParameter>;

type Parameter = {
  notion: Omit<ParameterInput['notion'], 'database_id'> & {databaseId: string}
};

export async function fetchParameters({parameterStoreId}: {
  parameterStoreId: string
}): Promise<Parameter> {
  const client = new SSMClient({})
  const response = await client.send(new GetParameterCommand({
    Name: parameterStoreId
  }))
  if (response.Parameter?.Value === undefined)
    throw new ParameterException(
      `Failed to get parameters, parameterStoreId: ${parameterStoreId}`
    );
  try {
    const obj = JSON.parse(response.Parameter.Value);
    if (!tParameter.is(obj))
      throw new ParameterException(
        `Failed to loader parameters, parameterStoreId: ${parameterStoreId}`
      );
    return {
      notion: {
        token: obj.notion.token,
        databaseId: obj.notion.database_id
      }
    };
  } catch (e) {
    throw new ParameterException(
      `Failed to parse parameters, parameterStoreId: ${parameterStoreId}`
    );
  }
}
