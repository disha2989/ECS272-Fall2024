import React, { useEffect, useRef, useState } from 'react';
import { select, BaseType } from 'd3-selection';
import { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { max } from 'd3-array';
import { easeExpOut } from 'd3-ease';
import { csv } from 'd3-fetch';
import { VisualizationProps } from '../types';

interface DataPoint {
  category: string;
  value: string;
  count: number;
}

const StackedBarChart: React.FC<VisualizationProps> = ({ isModalView = false }) => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Gender');
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const categories = [
    { name: 'Gender', column: 'Choose your gender' },
    { name: 'Year of Study', column: 'Your current year of Study' },
    { name: 'CGPA', column: 'What is your CGPA?' },
    { name: 'Depression', column: 'Do you have Depression?' },
    { name: 'Anxiety', column: 'Do you have Anxiety?' },
    { name: 'Panic attack', column: 'Do you have Panic attack?' },
    { name: 'Marital status', column: 'Marital status' },
    { name: 'Treatment', column: 'Did you seek any specialist for a treatment?' }
  ];

  // Helper function to capitalize each word for display purposes
  const formatValue = (value: string) => {
    return value
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    csv('/data/StudentMentalhealth.csv').then((csvData) => {
      const processedData: DataPoint[] = [];
      const currentCategory = categories.find(cat => cat.name === selectedCategory);
      
      if (currentCategory) {
        const uniqueValues = Array.from(
          new Set(csvData.map(d => (d[currentCategory.column] || '').toLowerCase()))
        ).filter(value => value);

        uniqueValues.forEach(value => {
          const count = csvData.filter(d => (d[currentCategory.column] || '').toLowerCase() === value).length;
          processedData.push({ category: selectedCategory, value, count });
        });
      }

      setData(processedData.sort((a, b) => b.count - a.count));
    });
  }, [selectedCategory]);

  useEffect(() => {
    if (!data.length || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const svg = select(svgRef.current);
    const margin = { top: 40, right: 120, bottom: 40, left: 60 };
    const width = containerWidth;
    const height = containerHeight - 20;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.selectAll("*").remove();

    svg
      .attr('width', width)
      .attr('height', height);

    const x = scaleBand()
      .domain(data.map(d => d.value))
      .range([0, innerWidth])
      .padding(0.5);

    const y = scaleLinear()
      .domain([0, max(data, d => d.count) as number * 1.2])
      .range([innerHeight, 0]);

    const color = scaleOrdinal<string, string>()
      .domain(data.map(d => d.value))
      .range(['#3B82F6', '#F97316']);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add gridlines
    g.selectAll('line.grid')
      .data(y.ticks(8))
      .join('line')
      .attr('class', 'grid')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .style('stroke', '#e2e8f0')
      .style('stroke-width', 0.5);

    // Add title
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text(`Distribution of ${selectedCategory}`);

    // Add bars with interactions
    const bars = g.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.value) || 0)
      .attr('width', x.bandwidth())
      .attr('y', innerHeight)
      .attr('height', 0)
      .attr('fill', d => color(d.value));

    // Add interactions only in modal view
    if (isModalView) {
      bars
        .on('mouseover', function(event: MouseEvent, d: DataPoint) {
          select(this)
            .style('opacity', '0.8')
            .style('cursor', 'pointer');

          const tooltip = select(tooltipRef.current);
          if (tooltip) {
            tooltip
              .style('opacity', '1')
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY - 10}px`)
              .html(`
                <div class="p-2">
                  <strong>${formatValue(d.value)}</strong><br/>
                  Count: ${d.count}<br/>
                  Percentage: ${((d.count / data.reduce((acc, curr) => acc + curr.count, 0)) * 100).toFixed(1)}%
                </div>
              `);
          }
        })
        .on('mousemove', function(event: MouseEvent) {
          const tooltip = select(tooltipRef.current);
          if (tooltip) {
            tooltip
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY - 10}px`);
          }
        })
        .on('mouseout', function() {
          select(this)
            .style('opacity', '1');

          const tooltip = select(tooltipRef.current);
          if (tooltip) {
            tooltip.style('opacity', '0');
          }
        });
    }

    // Animate bars
    bars.transition()
      .duration(750)
      .ease(easeExpOut)
      .attr('y', (d: DataPoint) => y(d.count))
      .attr('height', (d: DataPoint) => innerHeight - y(d.count));

    // Add value labels
    g.selectAll('.value-label')
      .data(data)
      .join('text')
      .attr('class', 'value-label')
      .attr('x', d => (x(d.value) || 0) + x.bandwidth() / 2)
      .attr('y', d => y(d.count) - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(d => d.count);

    // X Axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(axisBottom(x).tickFormat(formatValue))
      .style('font-size', '12px');

    // Y Axis
    g.append('g')
      .attr('class', 'y-axis')
      .call(axisLeft(y).ticks(8))
      .style('font-size', '12px');

    // Legend
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth + 20}, 0)`);

    data.forEach((d, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendItem.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', color(d.value));

      legendItem.append('text')
        .attr('x', 20)
        .attr('y', 10)
        .style('font-size', '12px')
        .text(formatValue(d.value));
    });

  }, [data, selectedCategory, isModalView]);

  return (
    <div className={`flex flex-col h-full ${isModalView ? 'modal-view' : ''}`}>
      <div className="p-4">
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-48 px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!isModalView}
        >
          {categories.map(cat => (
            <option key={cat.name} value={cat.name}>{cat.name}</option>
          ))}
        </select>
      </div>
      <div 
        ref={containerRef} 
        className="flex-1 p-4"
        style={{ minHeight: '400px' }}
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
        }}
      />
    </div>
  );
};

export default StackedBarChart;
