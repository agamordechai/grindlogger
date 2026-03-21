import { useState, useEffect } from 'react';
import { Ruler } from 'lucide-react';
import { getWeightUnit, setWeightUnit, type WeightUnit } from '../../hooks/useUnits';

export function UnitsSection() {
  const [unit, setUnit] = useState<WeightUnit>(getWeightUnit);

  useEffect(() => {
    const handler = () => setUnit(getWeightUnit());
    window.addEventListener('unit-change', handler);
    return () => window.removeEventListener('unit-change', handler);
  }, []);

  const handleChange = (u: WeightUnit) => {
    setWeightUnit(u);
    setUnit(u);
  };

  return (
    <div className="py-6 border-b border-border">
      <div className="flex items-center gap-2 mb-1">
        <Ruler size={16} className="text-ember" />
        <h3 className="text-sm font-bold text-chalk">Units</h3>
      </div>
      <p className="text-xs text-steel mb-4">
        Choose your preferred weight unit. All values are converted automatically.
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => handleChange('kg')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            unit === 'kg'
              ? 'bg-ember text-white shadow-lg shadow-ember/20'
              : 'bg-surface-2 text-steel border border-border hover:text-chalk'
          }`}
        >
          Kilograms (kg)
        </button>
        <button
          onClick={() => handleChange('lbs')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            unit === 'lbs'
              ? 'bg-ember text-white shadow-lg shadow-ember/20'
              : 'bg-surface-2 text-steel border border-border hover:text-chalk'
          }`}
        >
          Pounds (lbs)
        </button>
      </div>
    </div>
  );
}
