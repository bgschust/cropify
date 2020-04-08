var submitURL = 'https://api.airtable.com/v0/appH9wrWlVjhT2qnI/User%20Submissions?api_key=Airtable_Cropify-v2_Key';
var form = $('#newsletter-signup');
form.on('submit', function(e){
   e.preventDefault();
   var email = $(this).find('input[name=email]').val();

   if (!email) {
      $(this).find('input[name=email]').addClass("error");
     return;
   }
   var data = {
     'fields': {
       'Email': email,
    }
   };
  $.post(submitURL, data, function(data){
     $('#submit-message').text('Submitted!!!!');
     console.log('success',data)
  });
});


var Airtable = require('airtable');
Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: 'YOUR_API_KEY'
});
var base = Airtable.base('appH9wrWlVjhT2qnI');

base('User Submissions').create({
  "Email": "llama@gmail.com",
  "Profile Picture": [
    {
      "url": "https://dl.airtable.com/.attachments/picture.jpg"
    }
  ],
  "ID": "4657",
  "Phone Number": "888888888",
  "Delivery Address": "This is a street and city, state, zipcode",
  "Commerce Category": "Household Buyer",
  "Full Name": "Yama Llama"
}, function(err, record) {
  if (err) {
    console.error(err);
    return;
  }
  console.log(record.getId());
});
