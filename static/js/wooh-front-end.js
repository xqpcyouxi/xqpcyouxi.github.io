"use strict";
jQuery(function($){
	
	$('#send-inquiry').submit(function(e) {
  		e.preventDefault();

  		var data = $(this).serialize();
		$('.nm-progress span').text('Sending...').css('color', 'green');

		$.post(wooh_vars.ajaxurl, data, function(resp){
		  
			$('.nm-progress img').css('left', '101%');
			$('.nm-progress span').text(resp);
		});
  });
  
    $('.wooh-action-edit').on('click', '.input-action-btn', function(e) {
  		e.preventDefault();
  		
  		 var btn_val = $(this).closest('input').val('Please Wait...');
         btn_val.prop("disabled", true);
         
        swal({
              title: 'Please wait...',
              //timer: 2000,
              showCancelButton: false,
              showConfirmButton: false
        });
         
         
  	
  		var text     = $(this).closest('div').find('textarea').val();
        var key      = $(this).closest('div').data('key');

  		var data = {
  			'text_value' : text,
  			'wooh_key'   : key,
  			'action'	 : 'wooh_action_settings_save_frontend',
  		}
		

		$.post(wooh_vars.ajaxurl, data, function(resp){
			
// 			console.log(resp);
		  
		  location.reload();
		
		});
   });

});