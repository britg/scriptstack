$(function() {
    
    $('.loginTab').click(function() {
        $('#loginForm').removeClass('inactive');
        $('#signupForm').addClass('inactive');
        return false;
    });

    $('.signupTab').click(function() {
        $('#signupForm').removeClass('inactive');
        $('#loginForm').addClass('inactive');
        return false;
    });
});
