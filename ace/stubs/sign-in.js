/* Demo stand-in for GM's sign-in library (the gbpe auth script).
   It defines no session, so the navigation shows its signed-out state; "Sign In" hands off to buick.com. */
document.addEventListener('click', function (e) {
  var a = e.target && e.target.closest && e.target.closest('.gmx-sign-in');
  if (!a) return;
  e.preventDefault();
  location.href = 'https://www.buick.com/myaccount/overview';
});
