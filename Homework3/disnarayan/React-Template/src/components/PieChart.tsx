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
  const [firstChartTitle, setFirstChartTitle] = useState<string>('Mental Health Condition Combinations');
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

    // Add title for both charts
    if (showGender && selectedCategory) {
      svg.append('text')
        .attr('x', x)
        .attr('y', y - radius - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .text(`Gender Distribution - ${selectedCategory}`);
    } else {
      // Add title for the first chart
      svg.append('text')
        .attr('x', x)
        .attr('y', y - radius - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .text(firstChartTitle);
    }

    const pie = d3.pie<any>()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(radius * 0.4)
      .outerRadius(radius);

    const g = svg.append('g')
      .attr('transform', `translate(${x}, ${y})`);

    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc as any)
      .style('fill', (d, i) => color(showGender ? d.data.category : i.toString()))
      .style('cursor', isModalView ? 'pointer' : 'default')
      .on('mouseover', (event) => {
        // Add hover effect only
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('transform', 'scale(1.05)');
      })
      .on('mouseout', (event) => {
        // Remove hover effect
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('transform', 'scale(1)');
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

    // Add legend below the chart
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
        .attr('fill', color(showGender ? d.category : i.toString()));

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

    // Draw the first pie chart (Conditions)
    createPieChart(svg, data, {
      x: width * 0.25,
      y: height / 2 - 75,
      radius: radius,
      legendY: height / 2 + radius,
      onClick: isModalView ? setSelectedCategory : undefined
    });

    // Draw the second pie chart (Gender Breakdown) only if a category is selected in modal view
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

  }, [data, selectedCategory, isModalView, firstChartTitle]);

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