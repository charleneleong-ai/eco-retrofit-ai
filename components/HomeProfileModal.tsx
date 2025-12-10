
import React, { useState } from 'react';
import { HomeProfile } from '../types';
import { X, Check, Home, Users, Clock, Flame, Zap, Refrigerator } from 'lucide-react';
import Button from './Button';

interface HomeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: HomeProfile;
  onSave: (newProfile: HomeProfile) => Promise<void>;
}

const HomeProfileModal: React.FC<HomeProfileModalProps> = ({ isOpen, onClose, currentProfile, onSave }) => {
  const [formData, setFormData] = useState<HomeProfile>(currentProfile);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when modal opens if needed (handled by useState init currently)
  // Real implementation might use useEffect to sync if props change while open.

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    onClose();
  };

  const toggleAppliance = (app: string) => {
    const apps = new Set(formData.appliances);
    if (apps.has(app)) {
      apps.delete(app);
    } else {
      apps.add(app);
    }
    setFormData({ ...formData, appliances: Array.from(apps) });
  };

  const applianceOptions = [
    "Washing Machine", "Tumble Dryer", "Dishwasher", 
    "Electric Hob", "Electric Oven", "Microwave", 
    "Fridge Freezer", "Air Conditioner", "Dehumidifier"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
               <h2 className="text-2xl font-bold text-emerald-600">Update home profile</h2>
               <p className="text-slate-500 text-sm">Refine your benchmark comparison by updating specific details.</p>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
               <X className="w-5 h-5 text-slate-500" />
            </button>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-8">
            
            {/* Property Type */}
            <div>
               <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Home className="w-4 h-4 text-emerald-600" />
                  What kind of home do you have?
               </h3>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['Flat', 'Terraced', 'Semi-detached', 'Detached'].map(type => (
                      <button
                         key={type}
                         onClick={() => setFormData({...formData, propertyType: type})}
                         className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                             formData.propertyType === type 
                             ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                             : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                         }`}
                      >
                         {type}
                      </button>
                  ))}
               </div>
            </div>

            {/* Bedrooms & Occupants */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" />
                      How many people live here?
                  </h3>
                  <div className="flex items-center gap-4">
                     <input 
                        type="range" min="1" max="10" 
                        value={formData.occupants}
                        onChange={(e) => setFormData({...formData, occupants: parseInt(e.target.value)})}
                        className="flex-1 accent-emerald-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                     />
                     <span className="w-8 text-center font-bold text-lg text-slate-700">{formData.occupants}</span>
                  </div>
               </div>
               
               <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Home className="w-4 h-4 text-emerald-600" />
                      Number of bedrooms?
                  </h3>
                  <div className="flex items-center gap-4">
                     <input 
                        type="range" min="0" max="8" 
                        value={formData.bedrooms}
                        onChange={(e) => setFormData({...formData, bedrooms: parseInt(e.target.value)})}
                        className="flex-1 accent-emerald-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                     />
                     <span className="w-8 text-center font-bold text-lg text-slate-700">{formData.bedrooms}</span>
                  </div>
               </div>
            </div>

            {/* Occupancy Hours */}
            <div>
               <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  When is someone home on weekdays?
               </h3>
               <select 
                  value={formData.homeHours}
                  onChange={(e) => setFormData({...formData, homeHours: e.target.value})}
                  className="w-full p-3 border border-slate-300 rounded-xl text-slate-700 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
               >
                  <option value="Evenings & Weekends">Evenings & Weekends (Standard)</option>
                  <option value="Mornings & Evenings">Mornings & Evenings</option>
                  <option value="Most of the day">Most of the day (Stay at home parent/retired)</option>
                  <option value="All Day (WFH)">All Day (Work from Home)</option>
               </select>
            </div>

            {/* Heating */}
            <div>
               <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-emerald-600" />
                  What heats your home?
               </h3>
               <div className="flex flex-wrap gap-2">
                   {['Gas Boiler', 'Electric Radiators', 'Heat Pump', 'Oil Boiler', 'LPG', 'Underfloor'].map(heat => (
                       <button
                          key={heat}
                          onClick={() => setFormData({...formData, heatingType: heat})}
                          className={`py-1.5 px-3 rounded-full text-xs font-bold border transition-all ${
                              formData.heatingType === heat 
                              ? 'bg-emerald-600 text-white border-emerald-600' 
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                          }`}
                       >
                          {heat}
                       </button>
                   ))}
               </div>
            </div>

            {/* EV Charging */}
            <div>
               <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  Do you charge an Electric Vehicle at home?
               </h3>
               <div className="flex gap-4">
                  <button 
                     onClick={() => setFormData({...formData, hasEV: true})}
                     className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold transition-all ${formData.hasEV ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}
                  >
                     Yes
                  </button>
                  <button 
                     onClick={() => setFormData({...formData, hasEV: false})}
                     className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold transition-all ${!formData.hasEV ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-500'}`}
                  >
                     No
                  </button>
               </div>
            </div>

            {/* Appliances */}
            <div>
               <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Refrigerator className="w-4 h-4 text-emerald-600" />
                  Which appliances do you use?
               </h3>
               <div className="grid grid-cols-2 gap-2">
                  {applianceOptions.map(app => (
                     <div 
                        key={app} 
                        onClick={() => toggleAppliance(app)}
                        className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                            formData.appliances.includes(app)
                            ? 'bg-emerald-50 border-emerald-500'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                     >
                        <span className={`text-sm font-medium ${formData.appliances.includes(app) ? 'text-emerald-800' : 'text-slate-600'}`}>{app}</span>
                        {formData.appliances.includes(app) && <Check className="w-4 h-4 text-emerald-600" />}
                     </div>
                  ))}
               </div>
            </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white p-6 border-t border-slate-100 flex justify-end gap-3 z-10">
            <button 
               onClick={onClose} 
               disabled={isSaving}
               className="px-6 py-3 rounded-lg text-slate-600 font-bold hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
               Cancel
            </button>
            <Button onClick={handleSubmit} isLoading={isSaving} className="px-8 py-3 text-base">
               Save & Update Benchmark
            </Button>
        </div>
      </div>
    </div>
  );
};

export default HomeProfileModal;
