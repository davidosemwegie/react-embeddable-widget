import { useContext } from 'react';
import { WidgetContext } from '../lib/context';

export function Widget() {
  const { isOpen, setIsOpen } = useContext(WidgetContext);

  if (!isOpen) {
    return (
      <button className='widget-button' onClick={() => setIsOpen(true)}>
        Open Widget
      </button>
    );
  }

  return (
    <div className='widget-container bg-red-500'>
      <div className='widget-header'>
        <h3>Widget Title</h3>
        <button onClick={() => setIsOpen(false)}>Close</button>
      </div>

      <div className='widget-content'>
        {/* Your widget content goes here */}
      </div>
    </div>
  );
}
