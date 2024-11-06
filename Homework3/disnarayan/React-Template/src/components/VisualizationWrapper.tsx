import React, { useState } from 'react';
import Modal from './Modal';
import { VisualizationWrapperProps } from '../types';

const VisualizationWrapper: React.FC<VisualizationWrapperProps> = ({
  title,
  description,
  children
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="dashboard-card" onClick={() => setIsModalOpen(true)}>
        <div className="card-header">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="card-content">
          {React.cloneElement(children, { isModalView: false })}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={title}
      >
        <div className="modal-view">
          {React.cloneElement(children, { isModalView: true })}
        </div>
      </Modal>
    </>
  );
};

export default VisualizationWrapper;