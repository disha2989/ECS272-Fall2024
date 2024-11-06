import React from 'react';
import StackedBarChart from './components/StackedBarChart';
import PieChart from './components/PieChart';
import SankeyDiagram from './components/CollapsibleTree';
import ChordDiagram from './components/ChordDiagram';
import VisualizationWrapper from './components/VisualizationWrapper';

const App: React.FC = () => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Student Mental Health Dashboard</h1>
        <p>Interactive analysis of student mental health patterns and correlations</p>
      </header>

      <div className="dashboard-grid">
        <VisualizationWrapper
          title="Demographics Overview"
          description="Distribution of student demographics and mental health conditions"
        >
          <StackedBarChart />
        </VisualizationWrapper>

        <VisualizationWrapper
          title="Mental Health Condition Combinations"
          description="Interactive hierarchical view of mental health across demographics"
        >
          <PieChart />
        </VisualizationWrapper>

        <VisualizationWrapper
          title="Educational Path Flow"
          description="Student progression through courses and mental health patterns"
        >
          <SankeyDiagram />
        </VisualizationWrapper>

        <VisualizationWrapper
          title="Age-Based Relationships"
          description="Correlations between age groups and mental health conditions"
        >
          <ChordDiagram />
        </VisualizationWrapper>
      </div>

      <footer className="app-footer">
        <p>Data source: Student Mental Health Survey • Built with React & D3.js</p>
      </footer>
    </div>
  );
};

export default App;