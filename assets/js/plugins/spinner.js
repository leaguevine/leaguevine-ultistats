$(function () {
   $("#page_loading_area").ajaxStart(function() {
	   // Anytime any ajax request (system wide) starts, start the spinner
	   $(this).show();
   });
   $("#page_loading_area").ajaxStop(function() {
	   // Any time any ajax request ends, end the spinner
	   $(this).hide();
   });
	setTimeout(function () {
	  window.scrollTo(0, 1);
	}, 1000);
});