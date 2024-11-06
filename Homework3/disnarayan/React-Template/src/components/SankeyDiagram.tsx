import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyGraph, SankeyLink, SankeyNode } from 'd3-sankey';
import { csv } from 'd3-fetch';

interface RawNode {
  name: string;
}

interface RawLink {
  source: number;
  target: number;
  value: number;
}

type ProcessedNode = SankeyNode<RawNode, RawLink> & { index: number };
type ProcessedLink = SankeyLink<ProcessedNode, RawLink>;

const SankeyDiagram: React.FC = () => {
  const [data, setData] = useState<{ nodes: RawNode[], links: RawLink[] }>({ nodes: [], links: [] });
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    csv('/data/StudentMentalhealth.csv').then((csvData) => {
      const nodes: RawNode[] = [];
      const links: { [key: string]: number } = {};

      const mentalHealthConditions = [
        { name: 'Depression', column: 'Do you have Depression?' },
        { name: 'Anxiety', column: 'Do you have Anxiety?' },
        { name: 'Panic Attack', column: 'Do you have Panic attack?' }
      ];

      csvData.forEach(row => {
        const course = row['What is your course?'];
        const year = row['Your current year of Study'];

        [course, year].forEach(item => {
          if (!nodes.some(node => node.name === item)) {
            nodes.push({ name: item });
          }
        });

        mentalHealthConditions.forEach(condition => {
          const hasCondition = row[condition.column] === 'Yes';
          const conditionNode = `${condition.name} - ${hasCondition ? 'Yes' : 'No'}`;
          
          if (!nodes.some(node => node.name === conditionNode)) {
            nodes.push({ name: conditionNode });
          }

          const linkKey = `${year}|${conditionNode}`;
          links[linkKey] = (links[linkKey] || 0) + 1;
        });
      });

      const sankeyLinks: RawLink[] = Object.entries(links).map(([key, value]) => {
        const [source, target] = key.split('|');
        return {
          source: nodes.findIndex(node => node.name === source),
          target: nodes.findIndex(node => node.name === target),
          value: value
        };
      });

      setData({ nodes, links: sankeyLinks });
    });
  }, []);

  useEffect(() => {
    if (data.nodes.length === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 400;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');

    const sankeyGenerator = sankey<RawNode, RawLink>()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[0, 0], [width, height]]);

    const { nodes, links } = sankeyGenerator(data as unknown as SankeyGraph<RawNode, RawLink>);

    svg.append('g')
      .selectAll('rect')
      .data(nodes)
      .join('rect')
      .attr('x', d => d.x0!)
      .attr('y', d => d.y0!)
      .attr('height', d => d.y1! - d.y0!)
      .attr('width', d => d.x1! - d.x0!)
      .attr('fill', d => d3.schemeCategory10[d.index! % 10])
      .append('title')
      .text(d => `${d.name}\nCount: ${d.value}`);

    svg.append('g')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.5)
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', d => d3.schemeCategory10[(d.source as ProcessedNode).index! % 10])
      .attr('stroke-width', d => Math.max(1, d.width!));
  }, [data]);

  return <svg ref={svgRef} className="chart-container"></svg>;
};

export default SankeyDiagram;
