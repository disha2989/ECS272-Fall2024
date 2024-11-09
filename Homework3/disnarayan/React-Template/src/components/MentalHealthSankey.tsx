import React, { useEffect, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { csv } from 'd3-fetch';
import { scaleOrdinal } from 'd3-scale';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { VisualizationProps } from '../types';

interface SankeyNode {
  name: string;
  category: string;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  value?: number;
}

interface SankeyLink {
  source: number | SankeyNode;
  target: number | SankeyNode;
  value: number;
  width?: number;
}

interface ProcessedData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

const MentalHealthSankey: React.FC<VisualizationProps> = ({ isModalView = false }) => {
  const [data, setData] = useState<ProcessedData>({ nodes: [], links: [] });
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const processData = async () => {
      const csvData = await csv('/data/StudentMentalhealth.csv');

      // Create node categories
      const studyYears = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];
      const ageGroups = ['18-20', '21-22', '23-24'];
      const conditions = ['No Conditions', 'Depression', 'Anxiety', 'Panic Attack', 'Multiple Conditions'];
      const treatment = ['Sought Treatment', 'No Treatment'];

      // Create nodes array
      const nodes: SankeyNode[] = [
        ...studyYears.map(year => ({ name: year, category: 'year' })),
        ...ageGroups.map(age => ({ name: age, category: 'age' })),
        ...conditions.map(condition => ({ name: condition, category: 'condition' })),
        ...treatment.map(t => ({ name: t, category: 'treatment' }))
      ];

      // Initialize links
      const links: SankeyLink[] = [];
      const getNodeIndex = (name: string) => nodes.findIndex(n => n.name === name);

      // Process the data
      csvData.forEach(row => {
        // Get year index
        const yearStr = row['Your current year of Study'].toLowerCase();
        const year = yearStr.includes('year') ? 
          'Year ' + yearStr.match(/\d+/)?.[0] : undefined;
        if (!year || !studyYears.includes(year)) return;

        // Get age group
        const age = parseInt(row['Age'] || '0');
        let ageGroup = '';
        if (age >= 18 && age <= 20) ageGroup = '18-20';
        else if (age >= 21 && age <= 22) ageGroup = '21-22';
        else if (age >= 23 && age <= 24) ageGroup = '23-24';
        if (!ageGroup) return;

        // Count conditions
        const hasDepression = row['Do you have Depression?'] === 'Yes';
        const hasAnxiety = row['Do you have Anxiety?'] === 'Yes';
        const hasPanic = row['Do you have Panic attack?'] === 'Yes';
        const conditionCount = [hasDepression, hasAnxiety, hasPanic].filter(Boolean).length;
        
        let condition = 'No Conditions';
        if (conditionCount > 1) {
          condition = 'Multiple Conditions';
        } else if (hasDepression) {
          condition = 'Depression';
        } else if (hasAnxiety) {
          condition = 'Anxiety';
        } else if (hasPanic) {
          condition = 'Panic Attack';
        }

        // Treatment status
        const treatmentStatus = row['Did you seek any specialist for a treatment?'] === 'Yes' ? 
          'Sought Treatment' : 'No Treatment';

        // Add to links
        const addToLink = (source: string, target: string) => {
          const linkIndex = links.findIndex(
            l => l.source === getNodeIndex(source) && l.target === getNodeIndex(target)
          );
          if (linkIndex === -1) {
            links.push({
              source: getNodeIndex(source),
              target: getNodeIndex(target),
              value: 1
            });
          } else {
            links[linkIndex].value += 1;
          }
        };

        addToLink(year, ageGroup);
        addToLink(ageGroup, condition);
        addToLink(condition, treatmentStatus);
      });

      setData({ nodes, links });
    };

    processData();
  }, []);

  useEffect(() => {
    if (!data.nodes.length || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Adjusted margins and dimensions
    const margin = { top: 25, right: 25, bottom: 75, left: 25 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const svg = select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll("*").remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Sankey generator
    const sankeyGenerator = sankey<SankeyNode, SankeyLink>()
      .nodeWidth(10)
      .nodePadding(8)
      .extent([[0, 0], [width, height]]);

    const { nodes, links } = sankeyGenerator({
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d }))
    });

    // Updated color scales with gradients for ordinal values
    const yearColorScale = scaleOrdinal<string>()
      .domain(['Year 1', 'Year 2', 'Year 3', 'Year 4'])
      .range(['#9CB4D9', '#7393C5', '#4B72B2', '#23519E']); // Blue gradient

    const ageColorScale = scaleOrdinal<string>()
      .domain(['18-20', '21-22', '23-24'])
      .range(['#FFB399', '#FF8C66', '#FF6633']); // Orange gradient

    const conditionColorScale = scaleOrdinal<string>()
      .domain(['No Conditions', 'Depression', 'Anxiety', 'Panic Attack', 'Multiple Conditions'])
      .range(['#10B981', '#059669', '#047857', '#065F46', '#064E3B']); // Green variations

    // Updated treatment colors to match the screenshot
    const treatmentColorScale = scaleOrdinal<string>()
      .domain(['Sought Treatment', 'No Treatment'])
      .range(['#4F46E5', '#818CF8']); // New indigo/purple colors

    // Node color function
    const getNodeColor = (node: SankeyNode) => {
      switch (node.category) {
        case 'year':
          return yearColorScale(node.name);
        case 'age':
          return ageColorScale(node.name);
        case 'condition':
          return conditionColorScale(node.name);
        case 'treatment':
          return treatmentColorScale(node.name);
        default:
          return '#gray';
      }
    };

    // Draw links
    const links_g = g.append('g')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('fill', 'none')
      .attr('stroke', d => getNodeColor(d.source as SankeyNode))
      .attr('stroke-width', d => Math.max(1, d.width || 0))
      .attr('opacity', 0.5);

    // Draw nodes
    const nodes_g = g.append('g')
      .selectAll('rect')
      .data(nodes)
      .join('rect')
      .attr('x', d => d.x0 || 0)
      .attr('y', d => d.y0 || 0)
      .attr('height', d => (d.y1 || 0) - (d.y0 || 0))
      .attr('width', d => (d.x1 || 0) - (d.x0 || 0))
      .attr('fill', d => getNodeColor(d))
      .attr('opacity', 0.8);

    // Add labels
    g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('x', d => ((d.x0 || 0) < width / 2 ? (d.x1 || 0) + 4 : (d.x0 || 0) - 4))
      .attr('y', d => ((d.y1 || 0) + (d.y0 || 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => (d.x0 || 0) < width / 2 ? 'start' : 'end')
      .text(d => d.name)
      .style('font-size', '10px')
      .style('font-weight', '500');

    // Enhanced interactivity
    if (isModalView) {
      // Link interactions
      links_g
        .on('mouseover', function(event, d) {
          select(this)
            .attr('opacity', 0.8)
            .style('cursor', 'pointer');

          const tooltip = select(tooltipRef.current);
          const source = d.source as SankeyNode;
          const target = d.target as SankeyNode;
          
          tooltip
            .style('opacity', 1)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`)
            .html(`
              <div class="p-2">
                <strong>${source.name} → ${target.name}</strong><br/>
                Students: ${d.value}
              </div>
            `);
        })
        .on('mouseout', function() {
          select(this).attr('opacity', 0.5);
          select(tooltipRef.current).style('opacity', 0);
        });

      // Node interactions
      nodes_g
        .on('mouseover', function(event, d) {
          select(this)
            .attr('opacity', 1)
            .style('cursor', 'pointer');

          // Highlight connected links
          links_g
            .attr('opacity', 0.2)
            .filter(l => (l.source as any).name === d.name || (l.target as any).name === d.name)
            .attr('opacity', 0.8);

          const tooltip = select(tooltipRef.current);
          tooltip
            .style('opacity', 1)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`)
            .html(`
              <div class="p-2">
                <strong>${d.name}</strong><br/>
                Total Students: ${d.value}
              </div>
            `);
        })
        .on('mouseout', function() {
          select(this).attr('opacity', 0.8);
          links_g.attr('opacity', 0.5);
          select(tooltipRef.current).style('opacity', 0);
        });
    }
  }, [data, isModalView]);

  return (
    <div className={`flex flex-col h-full ${isModalView ? 'modal-view' : ''}`}>
      <div className="p-2">
        <h3 className="text-sm font-semibold">
          Student Mental Health Flow Analysis
        </h3>
        <p className="text-xs text-gray-600">
          Flow from Study Year → Age Group → Mental Health Conditions → Treatment
        </p>
      </div>
      <div 
        ref={containerRef} 
        className="flex-1 p-2"
        style={{ 
          height: isModalView ? '100%' : '220px',
          minHeight: isModalView ? '400px' : '220px'
        }}
      >
        <svg 
          ref={svgRef}
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'white',
          }}
        />
      </div>
      <div 
        ref={tooltipRef}
        className={`tooltip ${isModalView ? '' : 'hidden'}`}
        style={{
          position: 'absolute',
          opacity: 0,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          pointerEvents: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          fontSize: '11px',
          zIndex: 1000,
        }}
      />
    </div>
  );
};

export default MentalHealthSankey;