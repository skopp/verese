// variables
var my_email = null;
var my_name = null;
var my_currency = null;
var transaction_list_max = 0;
var transaction_list_min = 1000000;
var user_dict = {};

// function to correct geometry bug
function _fixgeometry() {
    /* Some orientation changes leave the scroll position at something
     * that isn't 0,0. This is annoying for user experience. */
    scroll(0, 0);

    /* Calculate the geometry that our content area should take */
    var header = $("div[data-role='header']:visible");
    var footer = $("div[data-role='footer']:visible");
    var content = $("div[data-role='content']:visible:visible");
    var viewport_height = $(window).height();

    var content_height = viewport_height - header.outerHeight() - footer.outerHeight();
    if((content.outerHeight() + header.outerHeight() + footer.outerHeight())<=viewport_height)
    {
	content_height -= (content.outerHeight() - content.height() + 1);
	content.height(content_height);
    }
    /* Trim margin/border/padding height */
}; /* fixgeometry */

function find_my_veresedaki(list) {
    // given a list of veresedakia, locate and return mine
    veresedaki = null;

    $.each(list,
	   function(key, value) {
	       if (value.ower.email == window.my_email) {
		   veresedaki = value;
	       }
	   }
	  );

    return veresedaki;
}

// function to initiailize #add page
function initialize_add_page() {
    var users = [];

    $.getJSON('/api/v1/relation/list/short/', function(json) {
		  $.map(json.data.relations,
		       function(item) {
		  	   users.push(item.username);
			   window.user_dict[item.username] = item
		  	   });
		  $('#add-search-field').autocomplete(
    		      {
    			  source: users,
    			  //submit form on suggestion selection
    			  select:function(e, ui){
			      $('#add-search-button').click();
    			  }
    		      });

		  // override private autocomplete method which encodes html and creates anchor with no href
		  $('#add-person-search').data( "autocomplete" )._renderItem = function( ul, item ) {
    		      return $( "<li></li>" )
			  .data( "item.autocomplete", item )
			  .append( $( "<a></a>" ).attr({href: '#'}).html( item.label ) )
			  .appendTo( ul );
		  };

	      });

    $('#add-search-field').bind('focus', function() { this.value='' });

    $('#add-search-button').bind('click', function(event) {
				   user = window.user_dict[$('#add-search-field').attr('value')];
				   $('#add-search-field').attr('value', 'Add another person');
				   ddata = [{
						'name': get_full_name(user),
						'md5': user.emailmd5,
						'id': user.id
					    }];
				     $('#addVeresedakiParticipant').tmpl(ddata).appendTo('#peoplelist');
				     $('#peoplelist').trigger('create');

				     if ($('.veresedaki_participant').length == 1)
				     	 $('.veresedaki_participant_slider').slider('disable');
				     else
				     	 $('.veresedaki_participant_slider').slider('enable');

				     $("#peoplelist").listview("refresh");

				     $('#slider-' + user.id).siblings('.ui-slider').bind('touchstart', sliderTouchStart);
				     $('#slider-' + user.id).siblings('.ui-slider').bind('mousedown', sliderTouchStart);
				     $('#slider-' + user.id).siblings('.ui-slider').bind('mouseup', sliderTouchEnd);
				     $('#slider-' + user.id).siblings('.ui-slider').bind('touchend', sliderTouchEnd);

				     update_veresedaki_sliders();


				     $('#add-search-field').attr('value', 'Add another person');
			       });

    navigator.geolocation.getCurrentPosition(
	function(position) {
	    if (position.coords.accuracy <= 10) {
		$.getJSON('/api/v1/locateme/?lat=' + position.coords.latitude + '&lon=' + position.coords.longitude,
			  function(json) {
			      $('#locationfield').attr('value', json.data.results[0].name);
			  });

	    }
	    else {
		$('#locationfield').attr('value', '');
	    }
	});

    $('#sumfield').change(function() {
			      update_veresedaki_sliders();
			  });
}

function sliderTouchStart(event) {
    window._slider_starting_value = $(event.target).closest('.veresedaki_participant').find('.veresedaki_participant_slider').val();
    window._slider_item = $(event.target).closest('.veresedaki_participant').find('.veresedaki_participant_slider');

}

function sliderTouchEnd(event) {
    diff = window._slider_item.val() - window._slider_starting_value;

    each_diff = diff / ($('.veresedaki_participant_slider').length - 1);

    $('.veresedaki_participant_slider').each(function(index, item) {
						 if (item != window._slider_item)
						     $(item).val(item.value - each_diff);
					     });

    $('.veresedaki_participant_slider').slider('refresh');

    window._slider_starting_value = null;
    window._slider_item = null;
}

function update_veresedaki_sliders() {
    sum_value = $('#sumfield').attr('value') / $('.veresedaki_participant').length;

    $('.veresedaki_participant_slider').attr('value', sum_value);
    $('.veresedaki_participant_slider').attr('max', $('#sumfield').attr('value'));

    $('.veresedaki_participant_slider').slider('refresh');
}

// function to initialize #login page
function initiliaze_login_page() {
    $('#loginform').submit(function(event) {
	event.preventDefault();
	$.mobile.showPageLoadingMsg();

	var success_cb = function(dataReceived, textStatus) {
	    $.mobile.changePage("#dashboard");
	};

	var error_cb = function(dataReceived, textStatus, errorThrown) {
	    alert('login error, try again');
	};

	$.ajax({
            type: 'POST',
            url: '/api/v1/login/',
            dataType: 'text',
            data: $(this).serialize(),
            success: success_cb,
            error: error_cb
        });

	// prevent browser from doing anything else
	return false;
    });

    // browserid
    $('#browserid').bind('click', function(e) {
	e.preventDefault();
	navigator.id.getVerifiedEmail(function(assertion) {
            if (assertion) {
		var $e = $('#id_assertion');
		$e.val(assertion.toString());
		$e.parent().submit();
            }
	});
    });
}


// return user's email
function whoami() {
    return window.my_email;
}

// acceptes a json object poiting to a user,
// returns True is this is me
// false otherwise
function user_is_me(user) {
    if (user.email == my_email)
	return true;
    else
	return false;
}

// accepts a json object poiting to a user
// return string with full name
function get_full_name(user) {
    return user.first_name + ' ' + user.last_name;
}

// function to initialize #activity page
function initiliaze_activity_page() {
    $.getJSON("/api/v1/transaction/after/" + window.transaction_list_max + "/?limit=10", populate_transactions);
}

// function to initialize #connections page
function initiliaze_connections_page() {
    $.getJSON("/api/v1/relation/list/", populate_relations);
}

// function to initialize #dashboard page
function initiliaze_dashboard_page() {
   $.getJSON("/api/v1/profile/", populate_profile);
}

// function to initialize #logout page
function initiliaze_logout_page() {
    var success_cb = function(dataReceived, textStatus) {
	$.mobile.changePage("#login");
    };

    var error_cb = function(dataReceived, textStatus, errorThrown) {
	alert('logout error, please try again');
    };

    $.ajax({
	type:'GET',
	url:'/api/v1/logout/',
	dataType: 'text',
	data:$(this).serialize(),
	success: success_cb,
	error: error_cb
    });
}

// function to initialize #welcome page
function initiliaze_welcome_page() {
    $('#welcomeform').submit(
	function(event) {
	    event.preventDefault();

	    var success_cb = function(dataReceived, textStatus) {
		$.mobile.changePage("#dashboard", {transition:'pop'});
	    };

	    var error_cb = function(dataReceived, textStatus, errorThrown) {
		alert('update error, please try again');
		// make this a jqm popup or something
	    };

	    // validate
	    if ($('#first_name').val() == '') {
		$('#first_name').focus();
		return false;
	    }
	    else if ($('#last_name').val() == '') {
		$('#last_name').focus();
		return false;
	    }
	    else if ($('#currency').val() == '') {
		$('#currency').focus();
		return false;
	    }

	    $.mobile.showPageLoadingMsg();

	    $.ajax({
		type:'PUT',
		url:'/api/v1/profile/',
		dataType: 'text',
		data:$(this).serialize(),
		success: success_cb,
		error: error_cb
	    });
	    return false;
	}
    );
}


function populate_profile(json) {
    // check if new user
    if (json.data.first_name == '')
	$.mobile.changePage('#welcome', '#welcome');

    window.my_name = json.data.first_name + ' ' + json.data.last_name;
    window.my_email = json.data.email;

}

function populate_relations(json) {
    $('#relation_list').empty();
    var ddata = [];

    $.each(json.data.relations,
           function(key, value) {
	       if (user_is_me(value.user1) == true)
		   user = value.user2;
	       else
		   user = value.user1;

	       ddata.push({
			      'balance': value.balance,
			      'user': user,
			      'currency': value.currency,
			      'id': value.id,
			      'updated': value.updated
			  });
	   }
	  );

    $("#relationItem").tmpl(ddata).appendTo("#relation_list");

    // pretty dates, updated once per minute
    $(".relation_date").prettyDate({interval:60000});

    $("#relation_list").listview("refresh");

}

function populate_transactions(json) {
    var ddata = [];

    $.each(json.data.transactions,
	   function(key, value)
	   {
	       // if payer is me
	       if (user_is_me(value.payer) == true) {
	       	   // if more than one owers
	       	   if (value.veresedakia.length > 1) {
		       item_md5 = 'foo';

	       	       item_name = '';
	       	       $.each(value.veresedakia,
	       		      function(vkey, vvalue) {
	       			  item_name += get_full_name(vvalue.ower) + ', ';
	       		      }
	       		     );
	       	       item_name = item_name.substring(0, item_name.length-2);
	       	   }
	       	   else {
		       item_md5 = value.veresedakia[0].ower.emailmd5;
	       	       item_name = get_full_name(value.veresedakia[0].ower);
	       	   }

	       	   item_amount = value.amount;
		   item_sign = '';
	       }
	       // i'm ower
	       else {
		   item_sign = '-';
	       	   item_md5 = value.payer.emailmd5;
	       	   item_name = get_full_name(value.payer);
 	       	   item_amount = find_my_veresedaki(value.veresedakia).amount + ' ' + value.currency.symbol;
	       }

	       if (value.status == "Accepted") {
		   // set icon
		   item_icon = 'check';

		   // set details
		   item_details = $('#transactionConfirmed').tmpl({})[0].innerHTML;
	       }
	       else {
		   // set icon
		   item_icon = 'alert';

		   // set details
		   item_details = $('#transactionUnconfirmed').tmpl({})[0].innerHTML;
	       }

	       ddata.push({
		   'id': value.id,
	           'md5': item_md5,
	       	   'name': item_name,
	       	   'comment':value.comment,
	       	   'amount': item_amount,
	           'date': value.created,
	           'location': value.place,
		   'icon': item_icon,
	           'sign': item_sign,
		   'currency': value.currency,
	           'details': item_details
	       });

	       if (window.transaction_list_max < value.id)
		   window.transaction_list_max = value.id;

	       if (window.transaction_list_min > value.id)
		   window.transaction_list_min = value.id;

	   }
	  ); // end each();

    $("#transactionItem").tmpl(ddata).appendTo("#transaction_list");

    // pretty dates, updated once per minute
    $(".transaction_date").prettyDate({interval:60000});

    $(".transaction-item-details").trigger('create');

    $("#transaction_list").listview("refresh");
}


// lives
$('#login').live('pagebeforeshow', initiliaze_login_page);
$('#dashboard').live('pagebeforeshow', initiliaze_dashboard_page);
$('#activity').live('pagebeforeshow', initiliaze_activity_page);
$('#connections').live('pagebeforeshow', initiliaze_connections_page);
$('#welcome').live('pagebeforeshow', initiliaze_welcome_page);
$('#logout').live('pagebeforeshow', initiliaze_logout_page);
$('#add').live('pagebeforeshow', initialize_add_page);

//disable Tap to togle on Bars
$.mobile.fixedToolbars
   .setTouchToggleEnabled(false);


// init
$(window).bind("orientationchange resize pageshow", _fixgeometry);

$(".transaction-item").bind("click",
			    function(event) {
				id = "#" + event.target.parentNode.id + "-details";
				if ($(id).is(":visible") == false)
				    toggle_only = true;
				else
				    toggle_only = false;

				if (toggle_only == true)
				    $(".transaction-item-details").slideUp();

				$("#" + event.target.parentNode.id + '-details').slideToggle();
			    }
			   );

$('#load-more-button').bind('click', "",
			    function() {
				$.getJSON("/api/v1/transaction/before/" +
					  window.transaction_list_min +
					  "/?limit=10",
					  populate_transactions);
			    });
