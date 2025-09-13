interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { id: 1, title: "Verify Details", description: "Enter your information" },
    { id: 2, title: "View Products", description: "Confirm your purchase" },
    { id: 3, title: "Roblox Account", description: "Enter username" },
    { id: 4, title: "Confirm Account", description: "Verify your profile" },
    { id: 5, title: "Discord Account", description: "Verify Discord profile" },
    { id: 6, title: "Ticket Created", description: "Get your items" },
  ];

  return (
    <div className="w-full bg-card border-y border-border py-4 sm:py-6 mb-8" data-testid="container-step-indicator">
      <div className="max-w-6xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-center space-x-1 sm:space-x-2 lg:space-x-4 overflow-x-auto">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center">
                <div 
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-200 ${
                    step.id <= currentStep
                      ? "bg-green-500 text-white shadow-lg"
                      : "bg-gray-300 text-gray-600"
                  }`}
                  data-testid={`indicator-step-${step.id}`}
                >
                  {step.id}
                </div>
                <div className="mt-1 sm:mt-2 text-center w-16 sm:w-20 lg:w-24">
                  <p 
                    className={`font-medium text-xs leading-tight ${
                      step.id <= currentStep ? "text-white dark:text-white" : "text-gray-400 dark:text-gray-400"
                    }`}
                    data-testid={`text-step-title-${step.id}`}
                  >
                    {step.title}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs leading-tight hidden sm:block" data-testid={`text-step-description-${step.id}`}>
                    {step.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div 
                  className={`w-4 sm:w-8 lg:w-16 h-0.5 mx-1 sm:mx-2 transition-all duration-200 ${
                    step.id < currentStep ? "bg-green-500" : "bg-gray-300"
                  }`}
                  data-testid={`progress-line-${step.id}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
