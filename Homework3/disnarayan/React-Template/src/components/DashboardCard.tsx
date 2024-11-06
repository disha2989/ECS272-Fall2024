import React from 'react';
import type { DashboardCardProps } from '../types';

const DashboardCard: React.FC<DashboardCardProps> = ({ 
  title, 
  description, 
  children, 
  onClick 
}) => (
  <div className="dashboard-card" onClick={onClick}>
    <div className="card-header">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    <div className="card-content">
      {children}
    </div>
  </div>
);

export default DashboardCard;