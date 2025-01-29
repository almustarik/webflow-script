document.addEventListener('DOMContentLoaded', function () {
  const steps = document.querySelectorAll('.step');
  const stepContents = document.querySelectorAll('.step-content');
  const form = document.getElementById('internationalShippingForm');
  const packageTypes = document.querySelectorAll('.package-type');
  let currentStep = 1;
  const formData = {
    step1: {},
    step2: {},
    step3: {},
  };

  function validateStep(step) {
    const currentFields = stepContents[step - 1].querySelectorAll(
      'input[required], select[required]',
    );
    for (const field of currentFields) {
      if (!field.value.trim()) {
        toastr.warning(
          `Please fill in the "${field.previousElementSibling.textContent}" field.`,
        );
        field.focus();
        return false;
      }
    }
    return true;
  }

  // Capture data from input and select fields in the current step
  function captureStepData(step) {
    const currentFormFields =
      stepContents[step - 1].querySelectorAll('input, select');
    currentFormFields.forEach((field) => {
      const fieldName = field.name; // Use the `name` attribute to identify fields
      const fieldValue = field.value;

      if (step === 1) {
        formData.step1[fieldName] = fieldValue;
      } else if (step === 2) {
        formData.step2[fieldName] = fieldValue;
      } else if (step === 3) {
        formData.step3[fieldName] = fieldValue;
      }
    });

    console.log(`Step ${step} Data:`, formData[`step${step}`]);

    // Log all steps data at the end
    if (step === steps.length) {
      console.log('All Steps Data:', formData);
      // alert(`All Steps Data: ${JSON.stringify(formData, null, 2)}`);
    }
  }

  // Package type selection
  packageTypes.forEach((type) => {
    type.addEventListener('click', () => {
      packageTypes.forEach((t) => t.classList.remove('selected'));
      type.classList.add('selected');
      formData.step3['packageType'] = type.dataset.type;
      console.log('Selected Package Type:', type.dataset.type); // Log the selected package type
    });
  });

  function updateStepper(step) {
    steps.forEach((s, index) => {
      if (index + 1 === step) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });

    stepContents.forEach((content, index) => {
      if (index + 1 === step) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  }

  document.querySelectorAll('.next-step').forEach((button) => {
    button.addEventListener('click', () => {
      if (!validateStep(currentStep)) {
        return; // Stop if validation fails
      }
      if (currentStep < steps.length) {
        captureStepData(currentStep);
        currentStep++;
        updateStepper(currentStep);
      }
    });
  });

  document.querySelectorAll('.prev-step').forEach((button) => {
    button.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep--;
        updateStepper(currentStep);
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    captureStepData(currentStep);

    try {
      const response = await fetch(
        'https://hook.us2.make.com/hfgzulugxuc4qhhsvr9f5cswi1j3mmfd',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData), // Send form data as JSON
        },
      );

      const contentType = response.headers.get('Content-Type');
      let result;

      if (contentType && contentType.includes('application/json')) {
        result = await response.json(); // Parse JSON response
        console.log('API Response (JSON):', result);
      } else {
        result = await response.text(); // Parse text response
        console.log('API Response (Text):', result);
      }

      if (response.ok) {
        console.log('Form data successfully sent to API.');
        window.location.href = `/freight-confirmation#freight-confirmed`;
      } else {
        console.error('API Error:', response.statusText);
        alert('There was an error submitting your data. Please try again.');
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      alert('A network error occurred. Please try again later.');
    }
  });

  updateStepper(currentStep);
});
