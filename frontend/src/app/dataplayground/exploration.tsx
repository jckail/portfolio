/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Named overflow regions must be focusable for keyboard table scrolling. */
import { useState } from 'react';

import './exploration.css';

import type { ExplorationDataset, ExplorationProduct } from './types';

const currency = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const magnitude = (vector: number[]) =>
  Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

/** Each term sums to cosine similarity; zero vectors contribute zero. */
export function cosineContributions(left: number[], right: number[]): number[] {
  const denominator = magnitude(left) * magnitude(right);
  if (left.length !== right.length) return left.map(() => 0);
  return left.map((value, index) => (denominator ? (value * right[index]) / denominator : 0));
}
export function cosineSimilarity(left: number[], right: number[]): number {
  return cosineContributions(left, right).reduce((sum, value) => sum + value, 0);
}
export function rankSimilarProducts(selected: ExplorationProduct, products: ExplorationProduct[]) {
  return products
    .filter((product) => product.id !== selected.id)
    .map((product) => ({ product, score: cosineSimilarity(selected.vector, product.vector) }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        (left.product.id < right.product.id ? -1 : left.product.id > right.product.id ? 1 : 0)
    )
    .slice(0, 5);
}
export function graphNeighborhood(graph: ExplorationDataset['graph'], id: string, limit = 16) {
  const relationships = graph.edges.filter((edge) => edge.source === id || edge.target === id);
  const neighborIds = new Set(
    relationships.map((edge) => (edge.source === id ? edge.target : edge.source))
  );
  const neighbors = graph.nodes
    .filter((node) => node.id !== id && neighborIds.has(node.id))
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  return {
    center: graph.nodes.find((node) => node.id === id),
    neighbors: neighbors.slice(0, limit),
    total: neighbors.length,
    relationships,
  };
}

function RelationshipGraph({
  dataset,
  selectedId,
  onSelect,
}: {
  dataset: ExplorationDataset;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { center, neighbors, total, relationships } = graphNeighborhood(dataset.graph, selectedId);
  const label = (id: string) => dataset.graph.nodes.find((node) => node.id === id)?.label || id;
  const positions = neighbors.map((node, index) => {
    const angle = (index * Math.PI * 2) / Math.max(neighbors.length, 1) - Math.PI / 2;
    return { ...node, x: 250 + Math.cos(angle) * 176, y: 188 + Math.sin(angle) * 142 };
  });
  return (
    <section id="lab-graph" className="lab-explore-graph" aria-labelledby="graph-title">
      <h3 id="graph-title">Who bought what?</h3>
      <p>Follow purchases and category membership one relationship from a selected node.</p>
      <label htmlFor="lab-graph-node">Graph node</label>
      <select
        id="lab-graph-node"
        value={selectedId}
        onChange={(event) => onSelect(event.target.value)}
      >
        {['product', 'customer', 'category'].map((kind) => (
          <optgroup label={`${kind[0].toUpperCase()}${kind.slice(1)} nodes`} key={kind}>
            {dataset.graph.nodes
              .filter((node) => node.kind === kind)
              .map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      {center ? (
        <>
          <svg
            className="lab-network"
            viewBox="0 0 500 380"
            role="img"
            aria-labelledby="network-title"
            aria-describedby="network-desc"
          >
            <title id="network-title">Relationships for {center.label}</title>
            <desc id="network-desc">
              Showing {neighbors.length} of {total} directly connected nodes. The table below lists
              every relationship with its direction and weight.
            </desc>
            {positions.map((node) => (
              <line key={`edge-${node.id}`} x1="250" y1="188" x2={node.x} y2={node.y} />
            ))}
            {positions.map((node, index) => (
              <g key={node.id} className={`lab-network-${node.kind}`}>
                <circle cx={node.x} cy={node.y} r="18" />
                <text x={node.x} y={node.y + 4} textAnchor="middle">
                  {index + 1}
                </text>
                <title>
                  {node.label} ({node.kind})
                </title>
              </g>
            ))}
            <g className="lab-network-center">
              <circle cx="250" cy="188" r="48" />
              <text x="250" y="185" textAnchor="middle">
                Selected
              </text>
              <text x="250" y="203" textAnchor="middle">
                {center.kind}
              </text>
            </g>
          </svg>
          <p className="lab-network-caption">
            <strong>{center.label}</strong> · {neighbors.length} of {total} neighbors shown
            {total > neighbors.length ? '; full relationships below' : ''}
          </p>
          <ol className="lab-network-key">
            {neighbors.map((node) => (
              <li key={node.id}>
                <button onClick={() => onSelect(node.id)}>
                  {node.label}
                  <span>{node.kind}</span>
                </button>
              </li>
            ))}
          </ol>
          <details>
            <summary>View relationships table ({relationships.length})</summary>
            {relationships.length ? (
              <div
                className="lab-table-scroll"
                role="region"
                tabIndex={0}
                aria-label="Graph relationships table"
              >
                <table>
                  <caption>
                    All direct relationships for {center.label}. Purchase weight is quantity;
                    category membership has weight 1.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">From</th>
                      <th scope="col">Relationship</th>
                      <th scope="col">To</th>
                      <th scope="col">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relationships.map((edge, index) => (
                      <tr key={`${edge.source}-${edge.target}-${index}`}>
                        <td>{label(edge.source)}</td>
                        <td>{edge.relation === 'purchased' ? 'Purchased' : 'Belongs to'}</td>
                        <td>{label(edge.target)}</td>
                        <td>{edge.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>This node has no direct relationships.</p>
            )}
          </details>
        </>
      ) : (
        <p>No graph nodes are available.</p>
      )}
    </section>
  );
}

function Similarity({
  dataset,
  selected,
  onSelect,
}: {
  dataset: ExplorationDataset;
  selected: ExplorationProduct;
  onSelect: (id: string) => void;
}) {
  const ranking = rankSimilarProducts(selected, dataset.products);
  const [compareId, setCompareId] = useState('');
  const comparison = ranking.find((item) => item.product.id === compareId) || ranking[0];
  const contributions = comparison
    ? cosineContributions(selected.vector, comparison.product.vector)
    : [];
  return (
    <section id="lab-vectors" className="lab-explore-vectors" aria-labelledby="vectors-title">
      <h3 id="vectors-title">What looks similar?</h3>
      <p>
        Compare handcrafted product features with cosine similarity. These are not model embeddings;
        the ranking runs directly over this small dataset, without a vector database.
      </p>
      <label htmlFor="lab-vector-product">Product to compare</label>
      <select
        id="lab-vector-product"
        value={selected.id}
        onChange={(event) => {
          onSelect(event.target.value);
          setCompareId('');
        }}
      >
        {dataset.products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
      <div className="lab-similarity-heading">
        <span>Nearest products</span>
        <span>Cosine score</span>
      </div>
      {ranking.length ? (
        <ol className="lab-similarity-list">
          {ranking.map(({ product, score }) => (
            <li key={product.id}>
              <button
                aria-pressed={comparison?.product.id === product.id}
                onClick={() => setCompareId(product.id)}
              >
                <span>
                  {product.name}
                  <small>{product.category}</small>
                </span>
                <strong>{score.toFixed(3)}</strong>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p>Add another product to compare feature vectors.</p>
      )}
      {comparison && (
        <div className="lab-contributions">
          <h4>Why {comparison.product.name}?</h4>
          <p>
            Each contribution is the product of the two feature values divided by both vector
            lengths. Contributions sum to the cosine score. Similarity is not a purchase
            probability.
          </p>
          <div className="lab-feature-legend">
            <span>Selected</span>
            <span>Neighbor</span>
            <span>Contribution</span>
          </div>
          <ul>
            {dataset.dimensions.map((dimension, index) => (
              <li key={dimension}>
                <div className="lab-feature-label">
                  <span>{dimension}</span>
                  <span>{contributions[index]?.toFixed(3) ?? '0.000'}</span>
                </div>
                <div className="lab-feature-bars">
                  <span
                    className="lab-feature-selected"
                    style={{
                      width: `${Math.min(1, Math.max(0, selected.vector[index] || 0)) * 100}%`,
                    }}
                  />
                  <span
                    className="lab-feature-neighbor"
                    style={{
                      width: `${Math.min(1, Math.max(0, comparison.product.vector[index] || 0)) * 100}%`,
                    }}
                  />
                </div>
                <span className="lab-feature-values">
                  Feature values: {selected.vector[index]?.toFixed(3) ?? '0.000'} /{' '}
                  {comparison.product.vector[index]?.toFixed(3) ?? '0.000'}
                </span>
              </li>
            ))}
          </ul>
          <p className="lab-note">
            Exact score: {comparison.score.toFixed(6)}. Feature bars use a shared 0–1 scale;
            displayed contributions are rounded.
          </p>
        </div>
      )}
    </section>
  );
}

export default function Exploration({ dataset }: { dataset: ExplorationDataset }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState(dataset.products[0]?.id || '');
  const [nodeId, setNodeId] = useState(dataset.products[0]?.id || dataset.graph.nodes[0]?.id || '');
  const products = dataset.products.filter(
    (product) =>
      (category === 'all' || product.category === category) &&
      `${product.id} ${product.name} ${product.category} ${product.description}`
        .toLowerCase()
        .includes(query.toLowerCase())
  );
  const selected =
    dataset.products.find((product) => product.id === selectedId) || dataset.products[0];
  const chooseProduct = (id: string) => {
    setSelectedId(id);
    if (dataset.graph.nodes.some((node) => node.id === id)) setNodeId(id);
  };
  const chooseNode = (id: string) => {
    setNodeId(id);
    if (dataset.products.some((product) => product.id === id)) setSelectedId(id);
  };
  return (
    <section
      id="lab-exploration"
      className="lab-exploration lab-section"
      aria-labelledby="exploration-title"
    >
      <div className="lab-section-heading">
        <div>
          <h2 id="exploration-title">One catalog. Two ways to explore.</h2>
          <p>{dataset.description}</p>
        </div>
        <span>Independent dataset / seed {dataset.seed}</span>
      </div>
      <p className="lab-exploration-disclosure">
        This seeded synthetic product and purchase dataset is separate from the lifecycle experiment
        above. Changing its scenario does not change these relationships or feature vectors.
      </p>
      <div className="lab-dataset-counts">
        <span>
          <strong>{dataset.products.length}</strong> products
        </span>
        <span>
          <strong>{dataset.customers.length}</strong> customers
        </span>
        <span>
          <strong>{dataset.purchases.length}</strong> purchase records
        </span>
        <span>
          <strong>{dataset.dimensions.length}</strong> feature dimensions
        </span>
      </div>
      <div className="lab-product-filters">
        <div>
          <label htmlFor="lab-product-search">Search products</label>
          <input
            id="lab-product-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, category, description…"
          />
        </div>
        <div>
          <label htmlFor="lab-product-category">Product category</label>
          <select
            id="lab-product-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {[...new Set(dataset.products.map((product) => product.category))]
              .sort()
              .map((name) => (
                <option key={name}>{name}</option>
              ))}
          </select>
        </div>
      </div>
      <p className="lab-note" aria-live="polite">
        {products.length} of {dataset.products.length} products shown. Select a product to explore
        both views.
      </p>
      {products.length ? (
        <div
          className="lab-table-scroll lab-product-table"
          tabIndex={0}
          role="region"
          aria-label="Synthetic product dataset"
        >
          <table>
            <caption>Product catalog with handcrafted feature vectors</caption>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Category</th>
                <th scope="col">Price</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <th scope="row">
                    <button
                      aria-pressed={selected?.id === product.id}
                      onClick={() => chooseProduct(product.id)}
                    >
                      {product.name}
                    </button>
                  </th>
                  <td>{product.category}</td>
                  <td>{currency(product.price_cents)}</td>
                  <td>{product.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="lab-empty">
          <p>No products match these filters.</p>
          <button
            onClick={() => {
              setQuery('');
              setCategory('all');
            }}
          >
            Clear product filters
          </button>
        </div>
      )}
      <div className="lab-exploration-views">
        <RelationshipGraph dataset={dataset} selectedId={nodeId} onSelect={chooseNode} />
        {selected ? (
          <Similarity dataset={dataset} selected={selected} onSelect={chooseProduct} />
        ) : (
          <section>
            <h3>What looks similar?</h3>
            <p>No products are available for similarity search.</p>
          </section>
        )}
      </div>
    </section>
  );
}
