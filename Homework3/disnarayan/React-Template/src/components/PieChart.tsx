import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { csv } from 'd3-fetch';
import { VisualizationProps } from '../types';

interface PieData {
  category: string;
  value: number;
  percentage: number;
  genderBreakdown: {
    Male: number;
    Female: number;
  };
}

const GENDER_COLORS = {
  Female: '#ff9999',  // Pink
  Male: '#66b3ff'     // Blue
};

const getConditionCount = (category: string): number => {
  return category === 'No Conditions' ? 0 : category.split('+').length;
};

const getConditionColor = (category: string) => {
  // Count the number of conditions by splitting on '+'
  const conditionCount = getConditionCount(category);
  
  // Use d3.interpolateBlues for a single-hue blue scheme
  switch (conditionCount) {
    case 0: return d3.interpolateBlues(0.2);  // Lightest - No conditions
    case 1: return d3.interpolateBlues(0.5);  // Single condition
    case 2: return d3.interpolateBlues(0.7);  // Two conditions
    case 3: return d3.interpolateBlues(0.9);  // Darkest - Three conditions
    default: return d3.interpolateBlues(0.3);
  }
};

const getYearColor = (year: number) => {
  // Use d3.interpolateGreens for year of study
  return d3.interpolateGreens(0.3 + (year * 0.15)); // Gradually darker green for higher years
};

const getAgeColor = (age: number) => {
  // Use d3.interpolatePurples for age groups
  // Assuming age range is typically 18-30 for students
  const normalized = (age - 18) / (30 - 18);
  return d3.interpolatePurples(0.3 + (normalized * 0.6));
};

const PieChart: React.FC<VisualizationProps> = ({ isModalView = false }) => {
  const [data, setData] = useState<PieData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [firstChartTitle, setFirstChartTitle] = useState<string>('Mental Health Condition Combinations');
  const [tooltip, setTooltip] = useState<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const processData = async () => {
      const csvData = await csv('/data/StudentMentalhealth.csv');
      const combinationsMap = new Map<string, { total: number, male: number, female: number }>();
      
      csvData.forEach(row => {
        const conditions = [];
        if (row['Do you have Depression?'] === 'Yes') conditions.push('Depression');
        if (row['Do you have Anxiety?'] === 'Yes') conditions.push('Anxiety');
        if (row['Do you have Panic attack?'] === 'Yes') conditions.push('Panic');
        
        const key = conditions.length === 0 ? 'No Conditions' : conditions.sort().join(' + ');
        const gender = row['Choose your gender'];

        if (!combinationsMap.has(key)) {
          combinationsMap.set(key, { total: 0, male: 0, female: 0 });
        }
        
        const current = combinationsMap.get(key)!;
        current.total += 1;
        if (gender === 'Male') current.male += 1;
        if (gender === 'Female') current.female += 1;
      });

      const processedData = Array.from(combinationsMap.entries())
        .map(([category, counts]) => ({
          category,
          value: counts.total,
          percentage: (counts.total / csvData.length) * 100,
          genderBreakdown: {
            Male: counts.male,
            Female: counts.female
          }
        }))
        // Sort by number of conditions first (for color intensity)
        .sort((a, b) => {
          const countA = getConditionCount(a.category);
          const countB = getConditionCount(b.category);
          return countA - countB;  // This will arrange from lightest to darkest
        });

      setData(processedData);
    };

    processData();
  }, []);

  useEffect(() => {
    const tooltipElement = document.createElement('div');
    tooltipElement.className = 'absolute hidden p-2 bg-white border border-gray-200 rounded shadow-lg text-sm';
    document.body.appendChild(tooltipElement);
    setTooltip(tooltipElement);

    return () => {
      if (tooltipElement) {
        tooltipElement.remove();
      }
    };
  }, []);

  const createPieChart = (
    svg: d3.Selection<SVGSVGElement | null, unknown, null, undefined>,
    data: any[],
    config: {
      x: number;
      y: number;
      radius: number;
      legendY: number;
      showGender?: boolean;
      chartType?: 'conditions' | 'year' | 'age';
      onClick?: (category: string) => void;
    }
  ) => {
    const { x, y, radius, legendY, showGender = false, chartType = 'conditions', onClick } = config;
    
    // Choose color scheme based on chart type
    const getColor = (d: any, i: number) => {
      if (showGender) {
        return GENDER_COLORS[d.data.category as keyof typeof GENDER_COLORS];
      }
      
      switch (chartType) {
        case 'conditions':
          return getConditionColor(d.data.category);
        case 'year':
          return getYearColor(parseInt(d.data.category));
        case 'age':
          return getAgeColor(parseInt(d.data.category));
        default:
          return d3.schemeSet3[i];
      }
    };

    svg.append('text')
      .attr('x', x)
      .attr('y', y - radius - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .text(showGender && selectedCategory ? `Gender Distribution - ${selectedCategory}` : firstChartTitle);

    const pie = d3.pie<any>()
      .value(d => d.value)
      .sort(null); // Keep the sorted order from our data processing

    const arc = d3.arc()
      .innerRadius(radius * 0.4)
      .outerRadius(radius);

    const labelArc = d3.arc()
      .innerRadius(radius * 0.9)
      .outerRadius(radius * 0.9);

    const g = svg.append('g')
      .attr('transform', `translate(${x}, ${y})`);

    // Create separate groups for paths and labels
    const pathsGroup = g.append('g').attr('class', 'paths');
    const labelsGroup = g.append('g').attr('class', 'labels');

    // Create arcs in the paths group
    const arcs = pathsGroup.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    // Add pie segments
    arcs.append('path')
      .attr('d', arc as any)
      .style('fill', (d, i) => getColor(d, i))
      .style('cursor', isModalView ? 'pointer' : 'default');

    // Add percentage labels in the labels group
    const labels = labelsGroup.selectAll('.percentage-label')
      .data(pie(data))
      .enter()
      .append('text')
      .attr('class', 'percentage-label')
      .attr('opacity', 0)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .style('fill', '#000000')
      
      .style('stroke-width', '2px')
      .style('paint-order', 'stroke')
      .style('pointer-events', 'none');

    labels.append('tspan')
      .text((d: any) => `${d.data.category}`)
      
      .attr('stroke-width', '0.5px');

    labels.append('tspan')
      .attr('x', 0)
      .attr('dy', '1.2em')
      .text((d: any) => `${d.data.percentage.toFixed(1)}%`)
      .attr('stroke-width', '0.5px');

    // Position labels
    labels.attr('transform', (d: any) => {
      const pos = labelArc.centroid(d);
      const midAngle = Math.atan2(pos[1], pos[0]);
      const x = Math.cos(midAngle) * (radius * 0.6);
      const y = Math.sin(midAngle) * (radius * 0.6);
      return `translate(${x}, ${y})`;
    });

    // Update hover events
    arcs.on('mouseover', (event, d: any) => {
      if (!tooltip) return;

      // Find and show the corresponding label
      labelsGroup.selectAll('.percentage-label')
        .filter((labelData: any) => labelData.data.category === d.data.category)
        .transition()
        .duration(200)
        .attr('opacity', 1);
      
      // Scale up segment
      d3.select(event.currentTarget).select('path')
        .transition()
        .duration(200)
        .attr('transform', 'scale(1.05)');

      // Show tooltip
      const percentage = d.data.percentage.toFixed(1);
      const count = d.data.value;
      
      tooltip.innerHTML = `
        <div class="font-medium">${d.data.category}</div>
        <div>Count: ${count}</div>
        <div>Percentage: ${percentage}%</div>
      `;
      
      const tooltipWidth = tooltip.offsetWidth;
      const tooltipHeight = tooltip.offsetHeight;
      const mouseX = event.pageX;
      const mouseY = event.pageY;
      
      tooltip.style.left = `${mouseX - tooltipWidth / 2}px`;
      tooltip.style.top = `${mouseY - tooltipHeight - 10}px`;
      tooltip.classList.remove('hidden');
    })
    .on('mouseout', (event, d: any) => {
      if (!tooltip) return;
      
      // Hide label
      labelsGroup.selectAll('.percentage-label')
        .filter((labelData: any) => labelData.data.category === d.data.category)
        .transition()
        .duration(200)
        .attr('opacity', 0);
      
      // Reset segment scale
      d3.select(event.currentTarget).select('path')
        .transition()
        .duration(200)
        .attr('transform', 'scale(1)');

      tooltip.classList.add('hidden');
    });

    if (isModalView) {
      arcs.style('cursor', 'pointer')
        .on('click', (event, d: any) => {
          if (!showGender) {
            setFirstChartTitle(`Distribution - ${d.data.category}`);
          }
          if (onClick) onClick(d.data.category);
        });
    }

    const legendCols = showGender ? 2 : Math.min(data.length, 4);
    const legendWidth = legendCols * 120;
    
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${x - legendWidth / 2}, ${legendY})`);

    data.forEach((d: any, i) => {
      const row = Math.floor(i / legendCols);
      const col = i % legendCols;
      
      const legendRow = legend.append('g')
        .attr('transform', `translate(${col * 140}, ${row * 20})`);

      legendRow.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', getColor({ data: d }, i));

      legendRow.append('text')
        .attr('x', 15)
        .attr('y', 8)
        .attr('font-size', '11px')
        .text(d.category);
    });
  };

  useEffect(() => {
    if (!data.length || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = container.clientWidth;
    const height = container.clientHeight;
    const radius = Math.min(width / 6, height / 4);

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    createPieChart(svg, data, {
      x: width * 0.25,
      y: height / 2 - 75,
      radius: radius,
      legendY: height / 2 + radius,
      chartType: 'conditions',
      onClick: isModalView ? setSelectedCategory : undefined
    });

    if (selectedCategory && isModalView) {
      const categoryData = data.find(d => d.category === selectedCategory);
      if (categoryData) {
        const genderData = [
          { category: 'Female', value: categoryData.genderBreakdown.Female, percentage: (categoryData.genderBreakdown.Female / categoryData.value) * 100 },
          { category: 'Male', value: categoryData.genderBreakdown.Male, percentage: (categoryData.genderBreakdown.Male / categoryData.value) * 100 }
        ];

        createPieChart(svg, genderData, {
          x: width * 0.75,
          y: height / 2 - 75,
          radius: radius,
          legendY: height / 2 + radius,
          showGender: true
        });
      }
    }
  }, [data, selectedCategory, isModalView, firstChartTitle, tooltip]);

  return (
    <div 
      ref={containerRef} 
      className="flex-1"
      style={{ height: isModalView ? '500px' : '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
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
  );
};

export default PieChart;