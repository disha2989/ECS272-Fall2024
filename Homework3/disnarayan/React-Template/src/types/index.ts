// Basic dimension interfaces
export interface Dimensions {
  width: number;
  height: number;
}

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Chart specific interfaces
export interface ChartProps {
  width?: number;
  height?: number;
}

// Component Props interfaces
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

export interface DashboardCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  onClick: () => void;
}

// Data interfaces
export interface StudentData {
  Age: string;
  'Do you have Depression?': string;
  'Do you have Anxiety?': string;
  'Do you have Panic attack?': string;
  'What is your course?': string;
  'Your current year of Study': string;
  'Marital status': string;
  'CGPA': string;
  [key: string]: string;
}

export interface DataPoint {
  category: string;
  value: string;
  count: number;
}

export interface ChartDimensions {
  width: number;
  height: number;
  margin: Margin;
  boundedWidth: number;
  boundedHeight: number;
}

export interface SankeyNode {
  name: string;
  id?: string;
  [key: string]: any;
}

export interface SankeyLink {
  source: number | string;
  target: number | string;
  value: number;
  [key: string]: any;
}

export interface ChordData {
  matrix: number[][];
  names: string[];
}

export interface VisualizationProps {
  isModalView?: boolean;
}

export interface VisualizationWrapperProps {
  title: string;
  description: string;
  children: React.ReactElement<VisualizationProps>;
}