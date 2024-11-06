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

const PieChart: React.FC<VisualizationProps> = ({ isModalView = false }) => {
  const [data, setData] = useState<PieData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
        .sort((a, b) => b.value - a.value);

      setData(processedData);
    };

    processData();
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
      onClick?: (category: string) => void;
    }
  ) => {
    const { x, y, radius, legendY, showGender = false, onClick } = config;
    const color = d3.scaleOrdinal(showGender ? [GENDER_COLORS.Female, GENDER_COLORS.Male] : d3.schemeSet3);

    const pie = d3.pie<any>()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(radius * 0.4)
      .outerRadius(radius);

    // Add chart title
    if (showGender && selectedCategory) {
      svg.append('text')
        .attr('x', x)
        .attr('y', y - radius - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .text(`Gender Distribution - ${selectedCategory}`);
    }

    const g = svg.append('g')
      .attr('transform', `translate(${x}, ${y})`);

    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc as any)
      .style('fill', (d, i) => color(showGender ? d.data.category : i.toString()));

    if (isModalView) {
      arcs.style('cursor', 'pointer')
        .on('click', (event, d: any) => {
          if (onClick) onClick(d.data.category);
        });
    }

    // Add legend below the chart
    const legendItemWidth = 120;
    const legendItemHeight = 20;
    const legendCols = Math.min(data.length, showGender ? 2 : 4);
    const legendWidth = legendCols * legendItemWidth;
    
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${x - legendWidth/2}, ${legendY})`);

    data.forEach((d: any, i) => {
      const row = Math.floor(i / legendCols);
      const col = i % legendCols;
      
      const legendRow = legend.append('g')
        .attr('transform', `translate(${col * legendItemWidth}, ${row * legendItemHeight})`);

      legendRow.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', color(showGender ? d.category : i.toString()));

      let labelText = showGender 
        ? `${d.category}: ${d.value}`
        : `${d.category}`;

      legendRow.append('text')
        .attr('x', 15)
        .attr('y', 8)
        .attr('font-size', '11px')
        .text(labelText);
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
      .attr('width', width)
      .attr('height', height);

    // Draw conditions pie chart
    createPieChart(svg, data, {
      x: width / 3,
      y: height / 2 - 30,
      radius: radius,
      legendY: height / 2 + radius + 20,
      onClick: isModalView ? setSelectedCategory : undefined
    });

    // Draw gender breakdown pie chart only in modal view when a category is selected
    if (selectedCategory && isModalView) {
      const categoryData = data.find(d => d.category === selectedCategory);
      if (categoryData) {
        const genderData = [
          { category: 'Female', value: categoryData.genderBreakdown.Female, percentage: (categoryData.genderBreakdown.Female / categoryData.value) * 100 },
          { category: 'Male', value: categoryData.genderBreakdown.Male, percentage: (categoryData.genderBreakdown.Male / categoryData.value) * 100 }
        ];

        createPieChart(svg, genderData, {
          x: (width * 2) / 3,
          y: height / 2 - 30,
          radius: radius,
          legendY: height / 2 + radius + 20,
          showGender: true
        });
      }
    }

  }, [data, selectedCategory, isModalView]);

  return (
    <div 
      ref={containerRef} 
      className="flex-1"
      style={{ height: isModalView ? '500px' : '300px' }}
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