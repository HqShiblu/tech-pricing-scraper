const express = require("express");
const cheerio = require("cheerio");
const path = require('path');
const ejs = require('ejs');
const http = require("http");
const { Server } = require("socket.io");

require('dotenv').config();

const app = express();
const port = process.env.PORT||3000;

const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

function renderView(viewName, data) {
    return new Promise((resolve, reject) => {
        ejs.renderFile(path.join(__dirname, 'views', `${viewName}.ejs`), data, (err, str) => {
            if (err) reject(err);
            else resolve(str);
        });
    });
}

async function scrapeStartech(searchText, socket_, signal){
  const query = searchText;
  searchText = searchText.split(" ").join("+");
  const url = `https://www.startech.com.bd/product/search?&search=${searchText}&limit=90`;
  
	fetch(url, { signal })
  .then(res => res.text())
  .then(html => {
    const $ = cheerio.load(html);
    const items = [];


    $(".p-item").each((i, el) => {
      const title = $(el).find(".p-item-name a").text().trim();
      const link = $(el).find(".p-item-name a").attr("href");
      const image = $(el).find(".p-item-img img").attr("src");
      const price = $(el).find(".p-item-price .price-new").text().trim()||$(el).find(".p-item-price span").text().trim();
	  let stock_out = false;
	  if($(el).find(".p-item-price span")){
		stock_out = ($(el).find(".p-item-price span").text().trim().toUpperCase().indexOf("OUT")!=-1);
	  }

      const description = [];
      $(el).find(".short-description li").each((i, li) => {
        description.push($(li).text().trim());
      });

      items.push({
        title,
        link,
        image,
        price:price.split(".")[0].replace(/\D/g, ''),
        description,
		stock_out,
		source:"star_tech"
      });
    });
	
	socket_.emit("searchResults", {
		query, items
	});

    return items;
	
  })
  .catch(err => {
    console.error("Error fetching or parsing:", err);
  });
}

async function scrapeTechland(searchText, socket_, signal) {
	const query = searchText;
	searchText = searchText.split(" ").join("+");
	const url = `https://www.techlandbd.com/index.php?route=product/search&sort=p.sort_order&order=ASC&search=${searchText}&limit=100`;	

  fetch(url, { signal })
  .then(res => res.text())
  .then(html => {
    const $ = cheerio.load(html);
    const items = [];

    $(".product-layout").each((i, el) => {

      const title = $(el).find(".name a").text().trim();
      const link = $(el).find(".name a").attr("href");
      const image = $(el).find(".product-img img").attr("src");
      const price = $(el).find(".price .price-normal").text().trim() || $(el).find(".price .price-new").text().trim();
      
	  const description = [];
      $(el).find(".description").children("li").each((i, li) => {
        description.push($(li).text().trim());
      });

      items.push({
        title,
        link,
        image,
        price:price.split(".")[0].replace(/\D/g, ''),
        description,
		source:"tech_land"
      });
	  	  
    });
	
	socket_.emit("searchResults", {
		query, items
	});
	
    return items;

   })
  .catch(err => {
    console.error("Error fetching or parsing:", err);
  });
}

async function scrapeRyans(searchText, socket_, signal) {
	const query = searchText;
	searchText = searchText.split(" ").join("%20");
	const url = `https://www.ryans.com/search?q=${searchText}&limit=102`;

  fetch(url, { signal })
  .then(res => res.text())
  .then(html => {
    const $ = cheerio.load(html);
    const items = [];

    $('div.cus-col-1.cus-col-2.cus-col-3.cus-col-4.cus-col-5.category-single-product.mb-1').each((index, element) => {
      const productUrl = $(element).find('a').attr('href');
      const productImage = $(element).find('img').attr('src');
      const productTitle = $(element).find('p.card-text.p-0.m-0.list-view-text a').text().trim();
      const priceText = $(element).find('p.pr-text.cat-sp-text.pt-2.pb-1').text().trim().match(/[\d,]+/);
	  const productPrice = priceText ? priceText[0].replace(/,/g, '') : "N/A";
      const productDescription = [$(element).find('p.card-text.p-0.m-0.grid-view-text').text().trim() || productTitle];
	  const stock_out = ($(element).find(".container__wrapper4").text().trim().toUpperCase().indexOf("OUT")!=-1);

      items.push({
        title: productTitle,
        link: productUrl,
        image: productImage,
        price: productPrice.split(".")[0].replace(/\D/g, ''),
        description: productDescription,
		stock_out,
		source:"ryans"
      });
    });
	
	socket_.emit("searchResults", {
		query, items
	});

    return items;

  })
  .catch(err => {
    console.error("Error fetching or parsing:", err);
  });
}

async function scrapeComputerVillage(searchText, socket_, signal) {
	const query = searchText;
	searchText = searchText.split(" ").join("%20");
	const url = `https://www.computervillage.com.bd/index.php?route=product/search&search=${searchText}&limit=100`;

 fetch(url, { signal })
  .then(res => res.text())
  .then(html => {
    const $ = cheerio.load(html);
    const items = [];
	
	$('.product-layout').each((i, el) => {
      const title = $(el).find('.caption .name a').text().trim();
      const link = $(el).find('.caption .name a').attr('href')?.trim();
      const image = $(el).find('.product-thumb .image a img').attr('src')?.trim();
      const priceText = $(el).find('.price .price-normal').text().trim();
      const priceMatch = priceText.match(/[\d,]+/);
	  let stock_out = false;
      let price = priceMatch ? priceMatch[0].replace(/,/g, '') : null;
	  const descriptionItems = [];
      $(el).find('.description li ul li').each((i, li) => {
        const text = $(li).text().trim();
        if (text) descriptionItems.push(text);
      });
	  
	  if(!price && price!=0){
		  price = "";
	  }
	  
	  stock_out = (price==0 || price=="");
	
      items.push({ title, link, image, price:price.split(".")[0].replace(/\D/g, ''), description:descriptionItems, stock_out, source:"village" });
    });
	
	socket_.emit("searchResults", {
		query, items
	});

    return items;

   })
  .catch(err => {
    console.error("Error fetching or parsing:", err);
  });
}

async function scrapeSmartTech(searchText, socket_, signal) {
	const query = searchText;
	searchText = searchText.split(" ").join("+");
	const url = `https://smartbd.com/?product_cat=&s=${searchText}&post_type=product`;

  fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: {
			"s":searchText,
			"post_type":"product",
			"product_cat":"",
			"ppp":-1
		},
		signal: signal
	})
  .then(res => res.text())
  .then(html => {
    const $ = cheerio.load(html);
    const items = [];
	
	$('.product-block.grid').each((i, el) => {
		const title = $(el).find('h3.name a').text().trim();
		const price = $(el).find('.price').text().replace(/\s+/g, ' ').trim().split(".")[0];
		const link = $(el).find('h3.name a').attr('href');
		const image = $(el).find('figure.image img').attr('data-src');
		
      items.push({ title, link, image, price:price.replace(/\D/g, ''), description:"", source:"smartbd" });
    });
	
	socket_.emit("searchResults", {
		query, items
	});

    return items;
  
   })
  .catch(err => {
    console.error("Error fetching or parsing:", err);
  });
}

async function scrapeCompterMania(searchText, socket_, signal){
  const query = searchText;
  searchText = searchText.split(" ").join("+");
  const url = `https://computermania.com.bd/shop/page/1/?s=${searchText}&post_type=product&per_page=100`;

  fetch(url, { signal })
  .then(res => res.text())
  .then(html => {
    const $ = cheerio.load(html);
    const items = [];
	
	$('.product-wrapper').each((index, element) => {
	  const product = $(element);
	  const title = product.find('.wd-entities-title a').text().trim();
	  const link = product.find('.product-image-link').attr('href');
	  const image = product.find('.product-image-link img').attr('src');
	  let price = product.find('.woocommerce-Price-amount.amount').text().replace(/\s+/g, ' ').trim();
	  
	  if(!price){
		  price = "";
	  }
	  
	  price = price.split("৳")[0].split(",").join("")
	  
	  items.push({
        title,
        link,
        image,
        price:price.replace(/\D/g, ''),
        description:"",
		source:"computer_mania"
      });
	});
	
	socket_.emit("searchResults", {
		query, items
	});

    return items;

   })
  .catch(err => {
    console.error("Error fetching or parsing:", err);
  });
}

async function scrapePCHouse(searchText, socket_, signal) {
	const query = searchText;
	searchText = searchText.split(" ").join("+");
	const url = `https://www.pchouse.com.bd/index.php?route=product/search&search=${searchText}&limit=100`;	

  fetch(url, { signal })
  .then(res => res.text())
  .then(html => {
    const $ = cheerio.load(html);
    const items = [];

    $(".product-layout").each((i, el) => {
      const title = $(el).find(".name a").text().trim();
      const link = $(el).find(".name a").attr("href");
      const image = $(el).find(".product-img img").attr("src");
      const price = $(el).find(".price .price-normal").text().trim() || $(el).find(".price .price-new").text().trim();
      const description = [$(el).find(".description").text().trim()];
	  const stock_out = ($(el).find(".buttons-wrapper .button-group").text().trim().toUpperCase().indexOf("OUT")!=-1);

      items.push({
        title,
        link,
        image,
        price:price.split(".")[0].replace(/\D/g, ''),
        description,
		stock_out,
		source:"pc_house"
      });
    });
	
	socket_.emit("searchResults", {
		query, items
	});
	
    return items;
	
	})
  .catch(err => {
    console.error("Error fetching or parsing:", err);
  });
}

async function scrapePickaboo(searchText, socket_, signal){
  const query = searchText;
  searchText = searchText.split(" ").join("+");
  const url = `https://searchserverapi.com/getresults?api_key=6W7Z0N7U0T&q=${searchText}&queryCorrection=true&suggestions=true&maxResults=100&categories=true&restrictBy[visibility]=3|4&restrictBy[status]=1&facets=true&restrictBy[category_ids]=&startIndex=0`;
  
	fetch(url, { signal })
  .then(res => res.json())
  .then(data => {
	  
	 let items = [];
	 
	for(a_product of data.items){
	  const title = a_product.title.trim();
      const link = "https://www.pickaboo.com/product-detail/"+a_product.url_key.trim();
      const image = a_product.image_link.trim();
      const price = a_product.price.trim();

      const description = [a_product.description.trim()];

      items.push({
        title,
        link,
        image,
        price:price.split(".")[0].replace(/\D/g, ''),
        description,
		source:"pickaboo"
      });
	}
	
	socket_.emit("searchResults", {
		query, items
	});

    return items;
	
  })
  .catch(err => {
    console.error("Error fetching or parsing:", err);
  });
}

async function scrapeGadStyle(searchText, socket_, signal){
  const query = searchText;
  searchText = searchText.split(" ").join("+");
  const url = `https://www.gadstyle.com/all-products/?s=${searchText}&post_type=product&per_page=50`;
  
  fetch(url, { signal })
  .then(res => res.text())
  .then(html => {
	 const $ = cheerio.load(html);
	 
	 let items = [];
	 
	$('.wd-product').each((index, element) => {
		const product = $(element);
		const title = product.find('h3.wd-entities-title a').text().trim();
		const price = product.find('span.price ins .woocommerce-Price-amount').text().trim() || 
					  product.find('span.price .woocommerce-Price-amount').text().trim();
		const image = product.find('.product-image-link img').attr('src');
		const link = product.find('.product-image-link').attr('href');

		items.push({
			title,
			price:price.split(".")[0].replace(/\D/g, ''),
			image,
			link,
			description:[],
			source:"gadstyle"
		});
	});
		
	socket_.emit("searchResults", {
		query, items
	});

    return items;
	
  })
  .catch(err => {
    console.error("Error fetching or parsing:", err);
  });
}

async function scrapeGadgetAndGear(searchText, socket_, signal){
  const query = searchText;
  searchText = searchText.split(" ").join("%20");
  const url = `https://api-v2.gadgetandgear.com/api/v2/product/storefront/elastic-search?currentPage=1&perPage=100.&search=${searchText}&`;
  
  fetch(url, { signal })
  .then(res => res.json())
  .then(data => {
	 
	let items = [];
	
	for(a_product of data.data){
		var an_item = {
			title:a_product.name,
			image:"https://assets.gadgetandgear.com/upload/"+a_product.thumbnail.split(",")[0],
			link:"https://gadgetandgear.com/product/"+a_product.slug,
			price:a_product.discounted_price,
			stock_out:(a_product.stockQuantity==0),
			description:[],
			source:"gadget_and_gear"
		};
		
		items.push(an_item);
	}
		
	socket_.emit("searchResults", {
		query, items
	});

    return items;
	
  })
  .catch(err => {
    console.error("Error fetching or parsing:", err);
  });
}


app.get("/", async (req, res) => {
	const html = await renderView('index', {});
	res.send(html);
});


app.get("/get-pricing-data", async (req, res) => {
  const searchText = req.query.search || '';
  if (!searchText) {
    return res.status(400).json({ error: "Please provide a search term" });
  }
        
  const [startechItems, techlandItems, ryansItems, villageitems, smarttechitems, computermaniaItems] = await Promise.all([
	scrapeStartech(searchText),
	scrapeComputerVillage(searchText),
	scrapeTechland(searchText),
	scrapeCompterMania(searchText),
	scrapeSmartTech(searchText),
	scrapeRyans(searchText)
]);


const combinedItems = [...startechItems, ...techlandItems, ...ryansItems,
						...villageitems, ...smarttechitems, ...computermaniaItems];
res.json({
	items:combinedItems
});

});

io.on("connection", (socket) => {
	
	const controller = new AbortController();
	const signal = controller.signal;
	
	socket.on("search", (searchText) => {
		scrapeStartech(searchText, socket, signal);
		scrapeComputerVillage(searchText, socket, signal);
		scrapeTechland(searchText, socket, signal);
		scrapeCompterMania(searchText, socket, signal);
		scrapeSmartTech(searchText, socket, signal);
		scrapeRyans(searchText, socket, signal);
		scrapePCHouse(searchText, socket, signal);
		scrapePickaboo(searchText, socket, signal);
		scrapeGadStyle(searchText, socket, signal);
		scrapeGadgetAndGear(searchText, socket, signal);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
	controller.abort(); 
  });
});


server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
