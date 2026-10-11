# Currency Converter

A web app that fetches live exchange rates and lets you convert any amount between world currencies. It also shows a searchable list of every currency, with the value of your amount in each one.

**Live demo:** https://nooreman285-oss.github.io/currency-converter/

## Features

- Live rates fetched with `fetch()` and `async/await` (free API, no key needed)
- Convert any amount between any two currencies (default: USD to PKR)
- Swap button to flip the conversion
- Searchable list of all currencies (search by code or name, e.g. "riyal")
- "Popular only" filter
- Click any currency in the list to make it the target currency
- Loading spinner and friendly error screen with a "Try again" button
- Falls back to a second and third data source if the first one fails
- Responsive layout (works on mobile)

## Tech used

HTML, CSS, JavaScript (no frameworks). Currency names come from the browser's built-in `Intl.DisplayNames`.

## Run locally

1. Clone the repo
2. Open `index.html` with Live Server in VS Code

To test the error state, add `?error=1` at the end of the page URL, or set the DevTools Network tab to Offline and reload.

## Note

Rates are for information only and can differ from bank or open-market rates.
