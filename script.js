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

    // 3. Dynamic Product Fetch, Pricing, Rendering & Filtering
    const productGrid = document.getElementById('dynamic-product-grid');
    const filterContainer = document.getElementById('category-filters');
    let allProducts = []; 
    let activeSale = null; 

    async function loadProducts() {
        if (!productGrid) return;
        
        try {
            // Fetch both JSON files in parallel
            const [pricingRes, productsRes] = await Promise.all([
                fetch('global-values.json'),
                fetch('products.json')
            ]);
            
            const pricing = await pricingRes.json();
            const rawProducts = await productsRes.json();
            
            activeSale = pricing.activeSale;

            // 1. Determine if the sale is currently within the active time window
            let isSaleTimeActive = false;
            
            if (activeSale && activeSale.enabled) {
                const now = new Date();
                
                // Construct Date objects from your JSON strings (Florida timezone -04:00)
                const startDate = new Date(`${activeSale.saleStartDate}T${activeSale.saleStartTime}:00-04:00`);
                const endDate = new Date(`${activeSale.saleEndDate}T${activeSale.saleEndTime}:59-04:00`);

                if (now >= startDate && now <= endDate) {
                    isSaleTimeActive = true;
                }
            }

            // 2. Process each product's price against the active sale
            allProducts = rawProducts.map(product => {
                const isFree = product.productType === 'free' || product.basePrice === 0 || product.price === "0.00" || product.price === 0;
                
                let finalPrice = product.basePrice;
                let isOnSale = false;
                let checkoutUrl = product.payhipUrl;

                if (!isFree && isSaleTimeActive) {
                    const saleCat = activeSale.appliedCategory;
                    
                    if (saleCat === 'all' || saleCat === product.productType) {
                        const multiplier = (100 - activeSale.discountPercentage) / 100;
                        finalPrice = (product.basePrice * multiplier).toFixed(2);
                        isOnSale = true;
                        
                        // Ensure link ends with /checkout before adding query parameters
                        let baseUrl = checkoutUrl.trim();
                        if (baseUrl.endsWith('/')) {
                            baseUrl = baseUrl.slice(0, -1);
                        }
                        if (!baseUrl.endsWith('/checkout')) {
                            baseUrl = `${baseUrl}/checkout`;
                        }

                        // Auto-apply Payhip coupon
                        const separator = baseUrl.includes('?') ? '&' : '?';
                        checkoutUrl = `${baseUrl}${separator}coupon=${activeSale.promoCode}`;
                    }
                }

                return {
                    ...product,
                    displayPrice: isFree ? "FREE" : Number(finalPrice).toFixed(2),
                    originalPrice: isFree ? null : Number(product.basePrice).toFixed(2),
                    isOnSale: isOnSale,
                    isFree: isFree,
                    checkoutUrl: checkoutUrl 
                };
            });
            
            renderSaleBanner(isSaleTimeActive ? activeSale : null);
            renderFilters(allProducts);
            renderProducts(allProducts); 
        } catch (error) {
            console.error('Error loading catalog data:', error);
            productGrid.innerHTML = '<p>Sorry, our catalog is currently unavailable. Please try again later.</p>';
        }
    }

    function renderSaleBanner(sale) {
        let banner = document.getElementById('announcement-banner');
        
        if (sale) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'announcement-banner';
                
                // Find the header and insert the banner INSIDE it, at the very bottom
                const header = document.querySelector('header');
                if (header) {
                    header.appendChild(banner);
                } else {
                    document.body.insertBefore(banner, document.body.firstChild);
                }
            }
            banner.className = 'announcement-banner-active';
            banner.innerHTML = `<p>${sale.bannerMessage}</p>`;
        } else if (banner) {
            banner.remove();
        }
    }

    function renderProducts(productsToRender) {
        productGrid.innerHTML = '';

        if (productsToRender.length === 0) {
            productGrid.innerHTML = '<p>No resources found for this category.</p>';
            return;
        }
        
        productsToRender.forEach(product => {
            const specRows = Object.entries(product.specs).map(([key, value]) => 
                `<tr><td>${key}</td><td>${value}</td></tr>`
            ).join('');

            let priceHTML = '';
            let buttonText = '';

            if (product.isFree) {
                priceHTML = `
                    <div class="price-container">
                        <span class="regular-price"><strong>FREE</strong>!</span>
                    </div>
                `;
                buttonText = 'Buy — <strong>FREE</strong>!';
            } else if (product.isOnSale) {
                priceHTML = `
                    <div class="price-container">
                        <span class="sale-price"><strong>$${product.displayPrice}</strong></span>
                        <span class="original-price" style="text-decoration: line-through; color: #888888;">$${product.originalPrice}</span>
                        <span class="sale-badge"><strong>SALE</strong></span>
                    </div>
                `;
                buttonText = `Buy — <strong>$${product.displayPrice}</strong>`;
            } else {
                priceHTML = `
                    <div class="price-container">
                        <span class="regular-price">$${product.displayPrice}</span>
                    </div>
                `;
                buttonText = `Buy — $${product.displayPrice}`;
            }

            const cardHTML = `
                <article class="product-card" data-checkout-url="${product.checkoutUrl}" data-price="${product.displayPrice}" data-free="${product.isFree}" data-onsale="${product.isOnSale}">
                    <div class="product-image">
                        <img src="${product.image}" alt="${product.imageAlt}" loading="lazy">
                    </div>
                    
                    <div class="product-info">
                        <h4 class="card-title">${product.title}</h4>
                        <p class="product-description card-desc">${product.description}</p>
                        
                        ${priceHTML}
                        
                        <div class="card-buttons">
                            <button class="cta-button product-btn view-details-btn">View Details</button>
                            <a href="${product.checkoutUrl}" target="_blank" class="cta-button product-btn secondary-button">${buttonText}</a>
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

        const uniqueCategories = new Set();
        products.forEach(p => {
            if (p.categories) {
                p.categories.forEach(cat => uniqueCategories.add(cat.toLowerCase()));
            }
        });

        let selectHTML = `<select id="category-dropdown" class="category-select" aria-label="Filter by category">`;
        selectHTML += `<option value="all">All</option>`;
        
        Array.from(uniqueCategories).sort().forEach(cat => {
            selectHTML += `<option value="${cat}">${cat}</option>`;
        });
        
        selectHTML += `</select>`;
        filterContainer.innerHTML = selectHTML;

        const dropdown = document.getElementById('category-dropdown');
        dropdown.addEventListener('change', (e) => {
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

    // Initialize the page
    loadProducts();

    // 4. Modal Logic using Event Delegation
    const modal = document.getElementById('product-modal');
    const closeModalBtn = document.getElementById('close-modal');
    
    const modalImg = document.getElementById('modal-img');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const modalExtra = document.getElementById('modal-extra-content');
    const modalBuyBtn = document.getElementById('modal-buy-btn');
    const modalSaleNote = document.getElementById('modal-sale-note');

    if (productGrid) {
        productGrid.addEventListener('click', function(e) {
            const trigger = e.target.closest('.view-details-btn, .product-image');
            
            if (trigger) {
                const card = trigger.closest('.product-card');
                
                modalImg.src = card.querySelector('.product-image img').src;
                modalImg.alt = card.querySelector('.product-image img').alt;
                modalTitle.textContent = card.querySelector('.card-title').textContent;
                modalDesc.textContent = card.querySelector('.card-desc').textContent;
                modalExtra.innerHTML = card.querySelector('.modal-data').innerHTML;
                
                const checkoutUrl = card.getAttribute('data-checkout-url');
                const price = card.getAttribute('data-price');
                const isFree = card.getAttribute('data-free') === "true";
                const isOnSale = card.getAttribute('data-onsale') === "true";
                
                modalBuyBtn.href = checkoutUrl;
                
                if (isFree) {
                    modalBuyBtn.innerHTML = 'Buy — <strong>FREE</strong>!';
                    if (modalSaleNote) modalSaleNote.style.display = 'none';
                } else if (isOnSale) {
                    modalBuyBtn.innerHTML = `Buy PDF — <strong>$${price}</strong>`;
                    if (modalSaleNote) modalSaleNote.style.display = 'block';
                } else {
                    modalBuyBtn.innerHTML = `Buy PDF — $${price}`;
                    if (modalSaleNote) modalSaleNote.style.display = 'none';
                }

                modal.showModal();
            }
        });
    }

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