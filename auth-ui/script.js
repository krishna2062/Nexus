document.addEventListener('DOMContentLoaded', () => {
    // Show login form
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const registerModal = document.getElementById('register-modal');
    const openRegisterModal = document.getElementById('open-register-modal');
    const closeRegisterModal = document.getElementById('close-register-modal');

    if(openRegisterModal) {
        openRegisterModal.addEventListener('click', () => {
            registerModal.classList.add('active');
        });
    }

    if(closeRegisterModal) {
        closeRegisterModal.addEventListener('click', () => {
            registerModal.classList.remove('active');
        });
    }

    if(signinForm) {
        signinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('username').value.trim();
            const pass = document.getElementById('password').value;

            try {
                await DB.login(email, pass);
                window.location.href = 'dashboard.html';
            } catch(err) {
                alert('Login failed: ' + err.message);
            }
        });
    }

    if(signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullname = document.getElementById('fullname').value.trim();
            const email = document.getElementById('email').value.trim();
            const pass = document.getElementById('reg-password').value;
            const confirmPass = document.getElementById('confirm-password').value;
            const profilePicFile = document.getElementById('profile-pic').files[0];

            if(pass !== confirmPass) {
                alert('Passwords do not match!');
                return;
            }

            const btn = signupForm.querySelector('.btn-signup');
            btn.textContent = 'Creating...';
            btn.disabled = true;

            const reader = new FileReader();
            reader.onload = async function(evt) {
                try {
                    await DB.register(email, pass, fullname, evt.target.result);
                    
                    registerModal.classList.remove('active');
                    document.getElementById('success-modal').classList.add('active');
                    
                    btn.textContent = 'Sign Up';
                    btn.disabled = false;
                    
                    document.getElementById('close-success-modal').addEventListener('click', () => {
                        document.getElementById('success-modal').classList.remove('active');
                        document.getElementById('login-email').value = email;
                    });
                } catch(err) {
                    alert('Registration failed: ' + err.message);
                    btn.textContent = 'Sign Up';
                    btn.disabled = false;
                }
            };

            if(profilePicFile) {
                reader.readAsDataURL(profilePicFile);
            } else {
                try {
                    await DB.register(email, pass, fullname, '');
                    alert('Account created successfully! Please log in.');
                    registerModal.classList.remove('active');
                    btn.textContent = 'Sign Up';
                    btn.disabled = false;
                } catch(err) {
                    alert('Registration failed: ' + err.message);
                    btn.textContent = 'Sign Up';
                    btn.disabled = false;
                }
            }
        });
    }
});
