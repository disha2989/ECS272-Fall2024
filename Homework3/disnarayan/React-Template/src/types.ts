// Place this file directly in the src folder, not in a types directory
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

export interface ChartProps {
  width?: number;
  height?: number;
}

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

export interface VisualizationProps {
  isModalView?: boolean;
}

export interface VisualizationWrapperProps {
  title: string;
  description: string;
  children: React.ReactElement<VisualizationProps>;
}