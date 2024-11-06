import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { VisualizationProps } from '../types';

interface DataRow {
  Age: string;
  'Do you have Depression?': string;
  'Do you have Anxiety?': string;
  'Do you have Panic attack?': string;
  [key: string]: string;
}

const ChordDiagram: React.FC<VisualizationProps> = ({ isModalView = false }) => {
  const ref = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const rawData = await d3.csv('/data/StudentMentalhealth.csv');
      const data = rawData as unknown as DataRow[];
      if (data) createChordDiagram(data);
    };

    fetchData();
  }, [isModalView]);

  const createChordDiagram = (data: DataRow[]) => {
    const svg = d3.select(ref.current);
    const width = 400;
    const height = 400;
    const innerRadius = Math.min(width, height) * 0.4;
    const outerRadius = innerRadius * 1.1;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');
    svg.selectAll('*').remove();

    const ages = Array.from({ length: 7 }, (_, i) => (i + 18).toString());
    const conditions = ['Depression', 'Anxiety', 'Panic attack'];
    const nodes = [...ages, ...conditions];

    const matrix = Array(nodes.length)
      .fill(null)
      .map(() => Array(nodes.length).fill(0));

    data.forEach((d) => {
      const age = parseInt(d.Age);
      if (age >= 18 && age <= 24) {
        const ageIndex = age - 18;
        conditions.forEach((condition, conditionIndex) => {
          if (d[`Do you have ${condition}?`] === 'Yes') {
            matrix[ageIndex][ages.length + conditionIndex]++;
            matrix[ages.length + conditionIndex][ageIndex]++;
          }
        });
      }
    });

    const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending);
    const chords = chord(matrix);

    const arc = d3.arc<d3.ChordGroup>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    const ribbon = d3.ribbon<d3.Chord, d3.ChordSubgroup>().radius(innerRadius);
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`)
      .datum(chords);

    // Add the arc paths and text labels
    const group = g.append('g')
      .selectAll('g')
      .data(chords.groups)
      .join('g');

    group.append('path')
      .attr('fill', d => color(d.index.toString()))
      .attr('stroke', 'white')
      .attr('d', arc);

    // Add text labels around the chord diagram for each node
    group.append('text')
      .each(d => {
        (d as any).angle = (d.startAngle + d.endAngle) / 2;
      })
      .attr('dy', '.35em')
      .attr('font-size', '5px')
      .attr('transform', d => `
        rotate(${((d as any).angle * 180 / Math.PI - 90)})
        translate(${outerRadius + 10})
        ${(d as any).angle > Math.PI ? 'rotate(180)' : ''}
      `)
      .attr('text-anchor', d => (d as any).angle > Math.PI ? 'end' : 'start')
      .text((d, i) => nodes[i]);

    // Add the ribbons
    const ribbons = g.append('g')
      .attr('fill-opacity', 0.67)
      .selectAll('path')
      .data(chords)
      .join('path')
      .attr('class', 'chord')
      .attr('d', ribbon)
      .attr('fill', d => color(d.source.index.toString()))
      .attr('stroke', 'white');

    // Only add interactions if in modal view
    if (isModalView) {
      ribbons
        .on('mouseover', function(event, d) {
          d3.select(this).attr('fill-opacity', 1);
          
          d3.select(tooltipRef.current)
            .style('opacity', 1)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`)
            .html(`
              <div class="p-2">
                <strong>Age ${nodes[d.source.index]} ↔ ${nodes[d.target.index]}</strong><br/>
                Connection: ${d.source.value}
              </div>
            `);
        })
        .on('mousemove', function(event) {
          d3.select(tooltipRef.current)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`);
        })
        .on('mouseout', function() {
          d3.select(this).attr('fill-opacity', 0.67);
          d3.select(tooltipRef.current).style('opacity', 0);
        });
    }
  };

  return (
    <div className={`relative ${isModalView ? 'modal-view' : ''}`}>
      <svg ref={ref} className="chart-container" />
      <div 
        ref={tooltipRef}
        className="tooltip"
      />
    </div>
  );
};

export default ChordDiagram;