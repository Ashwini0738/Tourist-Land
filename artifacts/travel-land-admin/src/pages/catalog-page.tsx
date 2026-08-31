// @ts-nocheck
import { useState, type ReactNode } from 'react';
import { Badge, Cell, Row, ShellList, Table, val } from './page-shared';

export function CatalogPage({
  title,
  description,
  query,
  heads,
  render,
}: {
  title: string;
  description: string;
  query: any;
  heads: string[];
  render: (x: any) => ReactNode;
}) {
  const [search, setSearch] = useState('');
  const items = (query.data?.items ?? []).filter((item: any) =>
    JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <ShellList
      title={title}
      eyebrow="Discovery catalog"
      description={description}
      query={query}
      items={items}
      search={search}
      setSearch={setSearch}
      count={query.data?.meta.total}
    >
      <Table heads={heads}>
        {items.map((item: any) => (
          <Row id={item.id} key={item.id}>
            {render(item)}
          </Row>
        ))}
      </Table>
    </ShellList>
  );
}

export { Badge, Cell, val };