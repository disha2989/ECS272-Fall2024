import React, { useEffect, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { max } from 'd3-array';
import { easeExpOut } from 'd3-ease';
import { csv } from 'd3-fetch';
import * as d3 from 'd3';
import { VisualizationProps } from '../types';

interface DataPoint {
  category: string;
  value: string;
  count: number;
}

// Enhanced color scheme
const COLOR_SCHEMES = {
  Gender: '#8884d8',  // Purple
  'Year of Study': '#4caf50',  // Green
  CGPA: '#2196f3',  // Blue
  Depression: '#ff5252',  // Vibrant Red
  Anxiety: '#ffa726',  // Warm Orange
  'Panic attack': '#ef5350',  // Coral Red
  'Marital status': '#4ecdc4',  // Teal
  Treatment: '#7e57c2'  // Deep Purple
};

const NO_COLOR = '#e0e0e0';  // Lighter grey for "No" responses

const isBinaryCategory = (category: string): boolean => {
  return ['Depression', 'Anxiety', 'Panic attack', 'Treatment', 'Marital status'].includes(category);
};

const getBarColor = (category: string, value: string): string => {
  const lowerValue = value.toLowerCase();
  
  switch (category) {
    case 'Year of Study':
      const year = parseInt(value);
      return d3.interpolateGreens(0.3 + (year * 0.15)) || COLOR_SCHEMES['Year of Study'];
      
    case 'CGPA':
      const cgpa = parseFloat(value);
      return d3.interpolateBlues(0.3 + (cgpa / 4 * 0.6)) || COLOR_SCHEMES.CGPA;
      
    case 'Depression':
    case 'Anxiety':
    case 'Panic attack':
    case 'Treatment':
      return lowerValue === 'yes' 
        ? COLOR_SCHEMES[category as keyof typeof COLOR_SCHEMES]
        : NO_COLOR;
        
    case 'Marital status':
      return lowerValue === 'no' ? NO_COLOR : COLOR_SCHEMES[category as keyof typeof COLOR_SCHEMES];
      
    default:
      return COLOR_SCHEMES[category as keyof typeof COLOR_SCHEMES] || '#3B82F6';
  }
};

const getLegendLabels = (category: string): { positive: string, negative: string } => {
  if (category === 'Marital status') {
    return { positive: 'Married', negative: 'Not Married' };
  }
  return { positive: 'Yes', negative: 'No' };
};

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
  const normalizeGPARange = (value: string): string => {
    // Remove all whitespace and convert to lowercase
    const normalized = value.toLowerCase().replace(/\s+/g, '');
    
    // Extract the numeric values using regex
    const matches = normalized.match(/(\d+\.?\d*)-(\d+\.?\d*)/);
    if (!matches) return value;
    
    // Format consistently with 2 decimal places
    const [_, start, end] = matches;
    return `${parseFloat(start).toFixed(2)} - ${parseFloat(end).toFixed(2)}`;
  };

  const formatValue = (value: string): string => {
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
        // Modify this section to use normalization for CGPA
        const uniqueValues = Array.from(
          new Set(csvData.map(d => {
            const value = (d[currentCategory.column] || '').toLowerCase();
            // Apply normalization only for CGPA category
            return currentCategory.name === 'CGPA' ? normalizeGPARange(value) : value;
          }))
        ).filter(value => value);

        uniqueValues.forEach(value => {
          const count = csvData.filter(d => {
            const dataValue = (d[currentCategory.column] || '').toLowerCase();
            // Apply same normalization when counting
            const normalizedDataValue = currentCategory.name === 'CGPA' 
              ? normalizeGPARange(dataValue)
              : dataValue;
            return normalizedDataValue === value;
          }).length;
          
          processedData.push({ 
            category: selectedCategory, 
            value, 
            count 
          });
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
    const margin = { top: 40, right: 40, bottom: 40, left: 60 };
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

    // Add legend for binary categories
    if (isBinaryCategory(selectedCategory)) {
      const legendLabels = getLegendLabels(selectedCategory);
      const legendG = g.append('g')
        .attr('transform', `translate(${innerWidth - 120}, -30)`);

      // Positive legend item
      legendG.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', COLOR_SCHEMES[selectedCategory as keyof typeof COLOR_SCHEMES]);

      legendG.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .text(legendLabels.positive)
        .style('font-size', '12px');

      // Negative legend item
      legendG.append('rect')
        .attr('x', 80)
        .attr('y', 0)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', NO_COLOR);

      legendG.append('text')
        .attr('x', 100)
        .attr('y', 12)
        .text(legendLabels.negative)
        .style('font-size', '12px');
    }

    // Add bars with new color scheme
    const bars = g.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.value) || 0)
      .attr('width', x.bandwidth())
      .attr('y', innerHeight)
      .attr('height', 0)
      .attr('fill', d => getBarColor(selectedCategory, d.value));

    // Add interactions only in modal view
    if (isModalView) {
      bars
        .on('mouseover', function(event: MouseEvent, d: DataPoint) {
          const baseColor = getBarColor(selectedCategory, d.value);
          const brighterColor = d3.color(baseColor)?.brighter(0.2)?.toString() || baseColor;
          
          select(this)
            .style('opacity', '0.8')
            .style('cursor', 'pointer')
            .style('fill', brighterColor);

          const tooltip = select(tooltipRef.current);
          if (tooltip) {
            const total = data.reduce((acc, curr) => acc + curr.count, 0);
            const percentage = ((d.count / total) * 100).toFixed(1);
            
            tooltip
              .style('opacity', '1')
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY - 10}px`)
              .html(`
                <div class="p-2">
                  <strong>${formatValue(d.value)}</strong><br/>
                  Count: ${d.count}<br/>
                  Percentage: ${percentage}%
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
        .on('mouseout', function(event: MouseEvent, d: DataPoint) {
          select(this)
            .style('opacity', '1')
            .style('fill', getBarColor(selectedCategory, d.value));

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