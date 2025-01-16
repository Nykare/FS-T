import React from 'react';
import PropTypes from 'prop-types';

const Button = ({ label, onClick, disabled = false, className = '' }) => (
  <button
    className={`button ${className} ${disabled ? 'disabled' : ''}`}
    onClick={!disabled ? onClick : null}
    disabled={disabled}
  >
    {label}
  </button>
);

Button.propTypes = {
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default Button;