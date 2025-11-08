function initApp() {
    console.log("Welcome to aap-kya-kr-skte-ho!");

    const featureItems = document.querySelectorAll('#features li');
    featureItems.forEach(item => {
        item.addEventListener('click', () => {
            alert(item.textContent.trim());
        });
    });
}

document.addEventListener('DOMContentLoaded', initApp);