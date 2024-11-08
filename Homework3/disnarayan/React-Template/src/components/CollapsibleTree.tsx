import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { csv } from 'd3-fetch';
import { VisualizationProps } from '../types';

interface TreeNode {
  name: string;
  value?: number;
  children?: TreeNode[];
  metadata?: {
    depression: number;
    anxiety: number;
    panic: number;
    treatment: number;
    total: number;
  };
}

interface CourseCategory {
  name: string;
  courses: string[];
}

const CollapsibleTree: React.FC<VisualizationProps> = ({ isModalView = false }) => {
  const [data, setData] = useState<TreeNode | null>(null);
  const [selectedView, setSelectedView] = useState<string>('All');
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Color constants
  const COLORS = {
    withConditions: '#F97316',
    noConditions: '#3B82F6',
    default: '#999',
    link: '#e2e8f0'
  };

  // Define view options
  const viewOptions = [
    { name: 'All', label: 'All Programs' },
    { name: 'STEM', label: 'STEM Programs' },
    { name: 'Social Sciences', label: 'Social Sciences Programs' },
    { name: 'Business', label: 'Business Programs' },
    { name: 'Religious Studies', label: 'Religious Studies Programs' },
    { name: 'Law & Humanities', label: 'Law & Humanities Programs' },
    { name: 'Healthcare', label: 'Healthcare Programs' }
  ];

  // Define course categories
  const categories: CourseCategory[] = [
    {
      name: 'STEM',
      courses: ['Engineering', 'BIT', 'BCS', 'Mathematics', 'Biomedical science', 'KOE', 'IT']
    },
    {
      name: 'Social Sciences',
      courses: ['Psychology', 'Human Resources', 'Human Sciences', 'Communication']
    },
    {
      name: 'Business',
      courses: ['Business Administration', 'Accounting', 'Banking Studies', 'KENMS', 'ENM']
    },
    {
      name: 'Religious Studies',
      courses: ['Islamic education', 'Pendidikan islam', 'KIRKHS', 'Usuluddin', 'Fiqh', 'Fiqh fatwa']
    },
    {
      name: 'Law & Humanities',
      courses: ['Laws', 'Law', 'BENL', 'ALA', 'TAASL']
    },
    {
      name: 'Healthcare',
      courses: ['Nursing', 'Radiography', 'MHSC']
    }
  ];

  // Function to normalize year format
  const normalizeYear = (year: string): string => {
    const normalized = year.toLowerCase().trim();
    return `Year ${normalized.replace(/^year\s*/, '')}`;
  };

  const processCategoryData = (category: CourseCategory, csvData: any[]): TreeNode => {
    const categoryNode: TreeNode = {
      name: category.name,
      children: [],
      metadata: {
        depression: 0,
        anxiety: 0,
        panic: 0,
        treatment: 0,
        total: 0
      }
    };

    // Process year groups
    const yearGroups = new Map<string, TreeNode>();

    csvData.forEach(row => {
      const course = row['What is your course?']?.toLowerCase();
      if (category.courses.some(c => course?.includes(c.toLowerCase()))) {
        const normalizedYear = normalizeYear(row['Your current year of Study']);

        if (!yearGroups.has(normalizedYear)) {
          yearGroups.set(normalizedYear, {
            name: normalizedYear,
            metadata: {
              depression: 0,
              anxiety: 0,
              panic: 0,
              treatment: 0,
              total: 0
            }
          });
        }

        const yearNode = yearGroups.get(normalizedYear)!;
        yearNode.metadata!.total++;

        if (row['Do you have Depression?'] === 'Yes') {
          yearNode.metadata!.depression++;
          categoryNode.metadata!.depression++;
        }
        if (row['Do you have Anxiety?'] === 'Yes') {
          yearNode.metadata!.anxiety++;
          categoryNode.metadata!.anxiety++;
        }
        if (row['Do you have Panic attack?'] === 'Yes') {
          yearNode.metadata!.panic++;
          categoryNode.metadata!.panic++;
        }
        if (row['Did you seek any specialist for a treatment?'] === 'Yes') {
          yearNode.metadata!.treatment++;
          categoryNode.metadata!.treatment++;
        }

        categoryNode.metadata!.total++;
      }
    });

    categoryNode.children = Array.from(yearGroups.values())
      .sort((a, b) => {
        const yearA = parseInt(a.name.replace(/\D/g, ''));
        const yearB = parseInt(b.name.replace(/\D/g, ''));
        return yearA - yearB;
      });

    return categoryNode;
  };

  useEffect(() => {
    const processData = async () => {
      const csvData = await csv('/data/StudentMentalhealth.csv');
      
      if (selectedView === 'All') {
        const root: TreeNode = {
          name: 'All Students',
          children: [],
          metadata: {
            depression: 0,
            anxiety: 0,
            panic: 0,
            treatment: 0,
            total: csvData.length
          }
        };

        categories.forEach(category => {
          const categoryNode = processCategoryData(category, csvData);
          if (categoryNode.metadata!.total > 0) {
            root.children!.push(categoryNode);
            root.metadata!.depression += categoryNode.metadata!.depression;
            root.metadata!.anxiety += categoryNode.metadata!.anxiety;
            root.metadata!.panic += categoryNode.metadata!.panic;
            root.metadata!.treatment += categoryNode.metadata!.treatment;
          }
        });

        setData(root);
      } else {
        const selectedCategory = categories.find(cat => cat.name === selectedView);
        if (selectedCategory) {
          const categoryNode = processCategoryData(selectedCategory, csvData);
          setData(categoryNode);
        }
      }
    };

    processData();
  }, [selectedView]);

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 40, right: 120, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const positionTooltip = (event: MouseEvent, tooltipContent: string) => {
      const tooltip = d3.select(tooltipRef.current);
      
      tooltip.html(tooltipContent);
      
      const tooltipNode = tooltip.node() as HTMLDivElement;
      const tooltipRect = tooltipNode.getBoundingClientRect();
      
      let left = event.pageX + 10;
      let top = event.pageY - 10;
      
      // Check right boundary
      if (left + tooltipRect.width > window.innerWidth) {
        left = event.pageX - tooltipRect.width - 10;
      }
      
      // Check bottom boundary
      if (top + tooltipRect.height > window.innerHeight) {
        top = event.pageY - tooltipRect.height - 10;
      }
      
      // Check left boundary
      if (left < 0) {
        left = 10;
      }
      
      // Check top boundary
      if (top < 0) {
        top = 10;
      }
      
      tooltip
        .style('left', `${left}px`)
        .style('top', `${top}px`)
        .style('opacity', 1);
    };

    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${margin.left}, ${height - 60})`);

    const legendItems = [
      { color: COLORS.withConditions, label: 'Mental Health Conditions Reported' },
      { color: COLORS.noConditions, label: 'No Conditions Reported' }
    ];

    const legendSpacing = 25;
    
    legendItems.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * legendSpacing})`);

      legendItem.append('circle')
        .attr('r', 6)
        .attr('fill', item.color);

      legendItem.append('text')
        .attr('x', 12)
        .attr('y', 4)
        .style('font-size', '12px')
        .text(item.label);
    });

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const treeLayout = d3.tree<TreeNode>()
      .size([innerHeight, innerWidth]);

    const root = d3.hierarchy(data);
    const treeData = treeLayout(root);

    const links = g.selectAll('.link')
      .data(treeData.links())
      .join('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal<any, any>()
        .x(d => d.y)
        .y(d => d.x))
      .style('fill', 'none')
      .style('stroke', COLORS.link)
      .style('stroke-width', 1.5);

    const nodes = g.selectAll('.node')
      .data(treeData.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`);

    nodes.append('circle')
      .attr('r', d => d.data.metadata?.total ? Math.sqrt(d.data.metadata.total) * 3 : 5)
      .attr('class', 'node-circle')
      .style('fill', d => {
        if (!d.data.metadata) return COLORS.default;
        const hasConditions = d.data.metadata.depression + 
                            d.data.metadata.anxiety + 
                            d.data.metadata.panic > 0;
        return hasConditions ? COLORS.withConditions : COLORS.noConditions;
      })
      .style('stroke', '#fff')
      .style('stroke-width', 2)
      .on('mouseover', function(event, d) {
        if (!isModalView) return;

        d3.select(this)
          .style('filter', 'brightness(0.9)');

        const metadata = d.data.metadata;
        if (metadata) {
          const tooltipContent = `
            <div class="p-3 bg-white rounded shadow">
              <strong>${d.data.name}</strong><br/>
              Total Students: ${metadata.total}<br/>
              Depression: ${((metadata.depression / metadata.total) * 100).toFixed(1)}%<br/>
              Anxiety: ${((metadata.anxiety / metadata.total) * 100).toFixed(1)}%<br/>
              Panic Attacks: ${((metadata.panic / metadata.total) * 100).toFixed(1)}%<br/>
              Seeking Treatment: ${((metadata.treatment / metadata.total) * 100).toFixed(1)}%
            </div>
          `;
          positionTooltip(event as unknown as MouseEvent, tooltipContent);
        }
      })
      .on('mouseout', function() {
        if (!isModalView) return;

        d3.select(this)
          .style('filter', 'none');

        d3.select(tooltipRef.current)
          .style('opacity', 0);
      });

    nodes.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => d.children ? -8 : 8)
      .attr('text-anchor', d => d.children ? 'end' : 'start')
      .text(d => d.data.name)
      .style('font-size', '12px')
      .clone(true).lower()
      .attr('stroke', 'white')
      .attr('stroke-width', 3);

  }, [data, selectedView, isModalView]);

  return (
    <div className={`flex flex-col h-full ${isModalView ? 'modal-view' : ''}`}>
      <div className="p-4">
        <select 
          value={selectedView}
          onChange={(e) => setSelectedView(e.target.value)}
          className="w-48 px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!isModalView}
        >
          {viewOptions.map(option => (
            <option key={option.name} value={option.name}>{option.label}</option>
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
          position: 'fixed',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 1000,
          maxWidth: '300px',
          backgroundColor: 'white',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '8px'
        }}
      />
    </div>
  );
};

export default CollapsibleTree;