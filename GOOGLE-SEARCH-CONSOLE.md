# Google Search Console Verification Guide

To make your app visible on Google, you must verify ownership of `juaexpress.com`. This will tell Google to crawl your site immediately and help differentiate it from other businesses.

## Step 1: Sign up for Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console/about).
2. Sign in with your Google account.
3. Click "Add property".
4. Enter `https://juaexpress.com` in the **URL prefix** section.

## Step 2: Choose Verification Method
1. Select the **HTML tag** method.
2. Copy the code provided. It will look something like this:
   `<meta name="google-site-verification" content="ABC123xyz..." />`

## Step 3: Update your code
1. Open `index.html` in your project.
2. Find the line:
   `<meta name="google-site-verification" content="ADD_YOUR_VERIFICATION_CODE_HERE" />`
3. Replace `ADD_YOUR_VERIFICATION_CODE_HERE` with the code you copied from Google.
4. Deploy your changes to your live site.

## Step 4: Verify in Search Console
1. Go back to Google Search Console and click **Verify**.
2. Once verified, click **Go to property**.

## Step 5: Submit your Sitemap
1. In the left-hand menu, click on **Sitemaps**.
2. Under "Add a new sitemap", enter `sitemap-index.xml`.
3. Click **Submit**.
4. Also submit `sitemap.xml`.

## Step 6: Request Indexing
1. Use the search bar at the top ("Inspect any URL") and enter `https://juaexpress.com`.
2. If it says "URL is not on Google", click **Request Indexing**.

> [!NOTE]
> It can take 24-72 hours for Google to start showing your site in search results after these steps.
