import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Smartphone,
  Wifi,
  WifiOff,
  Download,
  Upload,
  CheckCircle2,
  MapPin,
  Save,
  ArrowRight,
  Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OfflineCapabilityBanner } from '@/components/OfflineStatus'; // Ensure this file exists
import { AppShell } from '@/components/layout/AppShell';

// Moved static data outside component to prevent re-creation on render
const demoSteps = [
  {
    title: "Field Inspector Arrives",
    description: "Inspector arrives at remote farm location with mobile device",
    icon: MapPin,
  },
  {
    title: "Low Connectivity Detected",
    description: "App automatically switches to offline mode",
    icon: WifiOff,
  },
  {
    title: "Capture Quality Data",
    description: "Record moisture, temperature, pH readings locally",
    icon: CheckCircle2,
  },
  {
    title: "Export Draft",
    description: "Save inspection as JSON file for backup",
    icon: Download,
  },
  {
    title: "Return to Office",
    description: "Import draft and sync when connectivity restored",
    icon: Upload,
  }
];

const features = [
  {
    title: "Offline-First Design",
    description: "Works completely without internet connection",
    icon: WifiOff,
    color: "orange"
  },
  {
    title: "Auto-Save Drafts",
    description: "Saves inspection data locally every 30 seconds",
    icon: Save,
    color: "blue"
  },
  {
    title: "Export/Import",
    description: "JSON draft files for data portability",
    icon: Download,
    color: "green"
  },
  {
    title: "GPS Location",
    description: "Capture precise field coordinates",
    icon: MapPin,
    color: "purple"
  }
];

export default function OfflineDemo() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isOfflineMode, setIsOfflineMode] = React.useState(false);

  React.useEffect(() => {
    if (currentStep < demoSteps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        if (currentStep === 0) setIsOfflineMode(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 p-4">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold"
          >
            🏆 Round-1 Demo: Offline Inspector Capability
          </motion.h1>
          <p className="text-lg text-gray-600">
            Field inspections work in low-connectivity areas with auto-save and export/import
          </p>
          
          {/* Ensure this component exists or comment it out if not created yet */}
          <OfflineCapabilityBanner />
        </div>

        {/* Demo Flow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Inspection Workflow Simulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {demoSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === index;
                const isComplete = currentStep > index;
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.2 }}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${
                      isActive ? 'border-blue-300 bg-blue-50' : 
                      isComplete ? 'border-green-300 bg-green-50' :
                      'border-gray-200'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${
                      isComplete ? 'bg-green-100 text-green-600' :
                      isActive ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{step.title}</h3>
                        {isActive && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <Badge variant="outline" className="text-blue-600">
                              Processing...
                            </Badge>
                          </motion.div>
                        )}
                        {isComplete && (
                          <Badge className="bg-green-100 text-green-800">
                            ✓ Complete
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {currentStep === demoSteps.length - 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center"
              >
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-800">Workflow Complete!</p>
                  <p className="text-sm text-green-700 mt-1">
                    Inspection data captured and synced successfully
                  </p>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${
                        feature.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                        feature.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                        feature.color === 'green' ? 'bg-green-100 text-green-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">{feature.title}</h3>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Social Impact Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Social Impact: Low-Connectivity Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">2.9B</div>
                <div className="text-sm text-blue-700">People lack reliable internet</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">70%</div>
                <div className="text-sm text-green-700">Rural areas with poor connectivity</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">100%</div>
                <div className="text-sm text-orange-700">AgriQCert offline capability</div>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
              <h4 className="font-medium mb-2">Why This Matters for Social Impact Judges:</h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• ✅ Enables quality inspections in remote farming areas</li>
                <li>• ✅ Supports smallholder farmers in developing regions</li>
                <li>• ✅ Reduces digital divide impact on food certification</li>
                <li>• ✅ Ensures data integrity even without connectivity</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Try Demo */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold">Ready to Experience Offline Inspections?</h3>
              <p className="text-gray-600">
                Try the mobile-optimized inspection interface with offline capabilities
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link to="/mobile-inspection/demo001">
                    <Smartphone className="h-4 w-4 mr-2" />
                    Try Mobile Demo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                
                <Button asChild variant="outline">
                  <Link to="/inspection/demo001">
                    Try Desktop Version
                  </Link>
                </Button>
              </div>
              
              <div className="text-sm text-gray-500">
                💡 Tip: Turn off your WiFi to test true offline mode!
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}