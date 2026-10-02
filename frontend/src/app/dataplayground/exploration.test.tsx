import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import Exploration, {
  cosineContributions,
  cosineSimilarity,
  graphNeighborhood,
  rankSimilarProducts,
} from './exploration';

import type { ExplorationDataset, ExplorationProduct } from './types';

function product(id: string, vector: number[], category = 'Outdoor'): ExplorationProduct {
  return {
    id,
    name: `Product ${id}`,
    category,
    description: `${category} equipment ${id}`,
    price_cents: 1250,
    vector,
  };
}
const products = [
  product('a', [1, 0]),
  product('c', [1, 0]),
  product('b', [1, 0]),
  product('d', [0.8, 0.6]),
  product('e', [0, 1], 'Office'),
  product('f', [0.6, 0.8]),
  product('g', [0.5, Math.sqrt(0.75)]),
];
const dataset: ExplorationDataset = {
  seed: 42,
  description: 'Synthetic product features and purchases.',
  dimensions: ['Outdoor', 'Office'],
  products,
  customers: [{ id: 'customer-1', name: 'Customer One', segment: 'Explorer' }],
  purchases: [{ id: 'purchase-1', customer_id: 'customer-1', product_id: 'a', quantity: 2 }],
  graph: {
    nodes: [
      ...products.map((item) => ({ id: item.id, label: item.name, kind: 'product' as const })),
      { id: 'customer-1', label: 'Customer One', kind: 'customer' },
      { id: 'category-outdoor', label: 'Outdoor', kind: 'category' },
    ],
    edges: [
      { source: 'customer-1', target: 'a', relation: 'purchased', weight: 2 },
      { source: 'a', target: 'category-outdoor', relation: 'belongs_to', weight: 1 },
    ],
  },
};
afterEach(cleanup);

describe('cosine similarity', () => {
  it('normalizes magnitudes, handles zero vectors, and reconciles contributions', () => {
    expect(cosineSimilarity([2, 0], [20, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
    const contributions = cosineContributions([3, 4], [4, 3]);
    expect(contributions).toEqual([0.48, 0.48]);
    expect(contributions.reduce((sum, value) => sum + value, 0)).toBeCloseTo(0.96);
  });
  it('excludes self, returns top five and resolves equal scores by stable product ID', () => {
    expect(rankSimilarProducts(products[0], products).map((item) => item.product.id)).toEqual([
      'b',
      'c',
      'd',
      'f',
      'g',
    ]);
    expect(
      rankSimilarProducts(products[0], [...products].reverse()).map((item) => item.product.id)
    ).toEqual(['b', 'c', 'd', 'f', 'g']);
  });
});

describe('graph neighborhoods', () => {
  it('includes incoming and outgoing relationships and bounds the diagram without dropping table rows', () => {
    const view = graphNeighborhood(dataset.graph, 'a', 1);
    expect(view.neighbors).toHaveLength(1);
    expect(view.total).toBe(2);
    expect(view.relationships).toHaveLength(2);
    expect(graphNeighborhood(dataset.graph, 'e').neighbors).toEqual([]);
    expect(graphNeighborhood(dataset.graph, 'missing').center).toBeUndefined();
  });
});

describe('exploration interactions', () => {
  it('filters products by category and query and recovers from an empty result', () => {
    render(<Exploration dataset={dataset} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Product category' }), {
      target: { value: 'Office' },
    });
    expect(
      screen.getByText('1 of 7 products shown. Select a product to explore both views.')
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search products' }), {
      target: { value: 'missing' },
    });
    expect(screen.getByText('No products match these filters.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear product filters' }));
    expect(
      screen.getByText('7 of 7 products shown. Select a product to explore both views.')
    ).toBeInTheDocument();
  });
  it('connects table selection to vectors and graph, with accessible graph navigation', () => {
    render(<Exploration dataset={dataset} />);
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Synthetic product dataset' })).getByRole(
        'button',
        { name: 'Product d' }
      )
    );
    expect(screen.getByRole('combobox', { name: 'Product to compare' })).toHaveValue('d');
    expect(screen.getByRole('combobox', { name: 'Graph node' })).toHaveValue('d');
    fireEvent.change(screen.getByRole('combobox', { name: 'Graph node' }), {
      target: { value: 'customer-1' },
    });
    expect(screen.getByRole('img', { name: /Relationships for Customer One/ })).toBeInTheDocument();
    fireEvent.click(screen.getByText('View relationships table (1)'));
    const table = screen.getByRole('region', { name: 'Graph relationships table' });
    expect(within(table).getByText('Purchased')).toBeInTheDocument();
    expect(within(table).getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Product to compare' })).toHaveValue('d');
  });
  it('updates the explained neighbor and labels feature values and dataset independence', () => {
    render(<Exploration dataset={dataset} />);
    const vectorPanel = screen.getByRole('region', { name: 'What looks similar?' });
    fireEvent.click(within(vectorPanel).getByRole('button', { name: /Product d/ }));
    expect(screen.getByRole('heading', { name: 'Why Product d?' })).toBeInTheDocument();
    expect(screen.getByText('Feature values: 1.000 / 0.800')).toBeInTheDocument();
    expect(screen.getByText(/Exact score: 0.800000/)).toBeInTheDocument();
    expect(screen.getByText(/separate from the lifecycle experiment/)).toBeInTheDocument();
  });
});
