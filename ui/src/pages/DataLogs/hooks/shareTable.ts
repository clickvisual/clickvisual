interface SharedTable {
  key?: string;
  name?: string;
}

export const resolveInitialTableId = (
  isShare: boolean,
  urlTableId: string | number | undefined,
  savedTableId: string | number | undefined
) => (isShare ? urlTableId : urlTableId || savedTableId);

export const resolveSharedTableId = (
  tableName: string | undefined,
  tables: SharedTable[]
) => {
  if (!tableName) return undefined;

  const matches = tables.filter((table) => table.name === tableName);
  if (matches.length !== 1) return undefined;

  const match = matches[0].key?.match(/^table-(\d+)$/);
  return match ? parseInt(match[1], 10) : undefined;
};
