document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('refundForm');
  const checkbox = document.getElementById('agreement');
  const submitButton = document.getElementById('submitButton');
  const container = document.querySelector('.container');

  // Function to validate form
  function validateForm() {
    submitButton.disabled = !checkbox.checked; // Enable or disable button based on checkbox
  }

  // Event listener for checkbox
  checkbox.addEventListener('change', validateForm);

  // Submit event listener
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent actual form submission

    // Get values from input fields
    const orderId = document.getElementById('orderId').value;
    const email = document.getElementById('email').value;

    // Log the data to the console
    console.log('Order ID:', orderId);
    console.log('Email:', email);

    // Prepare data to send to the API
    const data = {
      orderId: orderId,
      email: email,
    };

    try {
      // Send data to the API using fetch
      const response = await fetch(
        'https://hook.us2.make.com/lpkktt42owqht8h2mw4cjzb3x63iqjkd',
        {
          method: 'POST', // HTTP method
          headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
          },
          body: JSON.stringify(data), // Convert data to JSON
        },
      );

      // Check the response content type
      const contentType = response.headers.get('Content-Type');

      if (response.ok) {
        let result;
        if (contentType && contentType.includes('application/json')) {
          result = await response.json(); // Parse JSON response
          console.log('API Response (JSON):', result);
        } else {
          result = await response.text(); // Parse text response
          console.log('API Response (Text):', result);
        }

        // Replace form content with a success message
        container.innerHTML = `
          <div class="success">
            <div class="status">Refund Requested</div>
            <h1 class="title">Refund Request Submitted <span>Successfully</span></h1>
            <p class="description">
              Thank you for submitting your refund request. Our team is reviewing the details and will process your request within 7–10 business days.
              You will receive an update via email once the process is complete.
            </p>
            <a href="#" class="continue-btn">Continue</a>
          </div>
        `;
      } else {
        console.error('API Error:', response.statusText);
        alert(
          'There was an error processing your request. Please try again later.',
        );
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      alert('There was a network error. Please try again later.');
    }
  });

  // Initial validation
  validateForm();
});
