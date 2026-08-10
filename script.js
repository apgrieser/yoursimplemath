document.addEventListener("DOMContentLoaded", () => {
    // 1. Automatically update copyright year in the footer
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // 2. Smooth scrolling for internal navigation links
    const navLinks = document.querySelectorAll('header nav a, .hero a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const headerOffset = 70;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth"
                    });
                }
            }
        });
    });

// 3. Dynamic Product Fetch, Rendering & Filtering
    const productGrid = document.getElementById('dynamic-product-grid');
    const filterContainer = document.getElementById('category-filters');
    let allProducts = []; // Master list to hold our fetched JSON data

    async function loadProducts() {
        if (!productGrid) return;
        
        try {
            const response = await fetch('products.json');
            allProducts = await response.json();
            
            renderFilters(allProducts);
            renderProducts(allProducts); // Initial render shows all
        } catch (error) {
            console.error('Error loading products:', error);
            productGrid.innerHTML = '<p>Sorry, our catalog is currently unavailable. Please try again later.</p>';
        }
    }

    function renderProducts(productsToRender) {
        // Clear the grid before adding filtered items
        productGrid.innerHTML = '';

        if (productsToRender.length === 0) {
            productGrid.innerHTML = '<p>No resources found for this category.</p>';
            return;
        }
        
        productsToRender.forEach(product => {
            const specRows = Object.entries(product.specs).map(([key, value]) => 
                `<tr><td>${key}</td><td>${value}</td></tr>`
            ).join('');

            const cardHTML = `
                <article class="product-card" data-payhip-url="${product.payhipUrl}" data-price="${product.price}">
                    <div class="product-image">
                        <img src="${product.image}" alt="${product.imageAlt}" loading="lazy">
                    </div>
                    
                    <div class="product-info">
                        <h4 class="card-title">${product.title}</h4>
                        <p class="product-description card-desc">${product.description}</p>
                        
                        <div class="card-buttons">
                            <button class="cta-button product-btn view-details-btn">View Details</button>
                            <a href="${product.payhipUrl}" target="_blank" class="cta-button product-btn secondary-button">Buy — $${product.price}</a>
                        </div>
                    </div>

                    <template class="modal-data">
                        <table class="specs-table">
                            ${specRows}
                        </table>
                        <section class="geo-qa">
                            <h5>${product.qa.question}</h5>
                            <p>${product.qa.answer}</p>
                        </section>
                    </template>
                </article>
            `;
            
            productGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    function renderFilters(products) {
        if (!filterContainer) return;

        // Extract every unique category from the products array
        const uniqueCategories = new Set();
        products.forEach(p => {
            if (p.categories) {
                // Forces everything to lowercase so capitalization in JSON doesn't matter
                p.categories.forEach(cat => uniqueCategories.add(cat.toLowerCase()));
            }
        });

        // Generate the select element and default "All" option
        let selectHTML = `<select id="category-dropdown" class="category-select" aria-label="Filter by category">`;
        selectHTML += `<option value="all">All</option>`;
        
        // Generate an option for each unique category (sorted alphabetically)
        Array.from(uniqueCategories).sort().forEach(cat => {
            selectHTML += `<option value="${cat}">${cat}</option>`;
        });
        
        selectHTML += `</select>`;
        filterContainer.innerHTML = selectHTML;

        // Add change listener to the dropdown
        const dropdown = document.getElementById('category-dropdown');
        dropdown.addEventListener('change', (e) => {
            // Determine which category to show
            const selectedCategory = e.target.value;
            
            if (selectedCategory === 'all') {
                renderProducts(allProducts);
            } else {
                const filtered = allProducts.filter(p => 
                    p.categories && p.categories.map(c => c.toLowerCase()).includes(selectedCategory)
                );
                renderProducts(filtered);
            }
        });
    }

    loadProducts();

    // 4. Modal Logic using Event Delegation
    const modal = document.getElementById('product-modal');
    const closeModalBtn = document.getElementById('close-modal');
    
    const modalImg = document.getElementById('modal-img');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const modalExtra = document.getElementById('modal-extra-content');
    const modalBuyBtn = document.getElementById('modal-buy-btn');

    // Listen for clicks on the parent grid container
    if (productGrid) {
        productGrid.addEventListener('click', function(e) {
            // Check if the clicked target (or its parent) is a trigger
            const trigger = e.target.closest('.view-details-btn, .product-image');
            
            if (trigger) {
                const card = trigger.closest('.product-card');
                
                // Populate Modal Data
                modalImg.src = card.querySelector('.product-image img').src;
                modalImg.alt = card.querySelector('.product-image img').alt;
                modalTitle.textContent = card.querySelector('.card-title').textContent;
                modalDesc.textContent = card.querySelector('.card-desc').textContent;
                modalExtra.innerHTML = card.querySelector('.modal-data').innerHTML;
                
                const payhipUrl = card.getAttribute('data-payhip-url');
                const price = card.getAttribute('data-price');
                modalBuyBtn.href = payhipUrl;
                modalBuyBtn.textContent = `Buy PDF — $${price}`;

                modal.showModal();
            }
        });
    }

    // Modal Closing Listeners
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => modal.close());
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            const dialogDimensions = modal.getBoundingClientRect();
            if (
                e.clientX < dialogDimensions.left ||
                e.clientX > dialogDimensions.right ||
                e.clientY < dialogDimensions.top ||
                e.clientY > dialogDimensions.bottom
            ) {
                modal.close();
            }
        });
    }
});