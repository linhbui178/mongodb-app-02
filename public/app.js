const tableBody = document.querySelector('#books-body');
const form = document.querySelector('#book-form');
const message = document.querySelector('#message');

function ShowMessage(text) {
  message.textContent = text;
}

function AddBookRow(book) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><a href="/api/books/${book._id}">${book.name}</a></td>
    <td>${book.author}</td>
    <td>${book.year}</td>
    <td>$${Number(book.price).toFixed(2)}</td>
  `;
  tableBody.appendChild(row);
}

async function LoadBooks() {
  tableBody.innerHTML = '';
  const response = await fetch('/api/books');
  const books = await response.json();
  books.forEach(AddBookRow);
  ShowMessage(`Loaded ${books.length} book(s).`);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const book = {
    name: formData.get('name'),
    author: formData.get('author'),
    year: Number(formData.get('year')),
    price: Number(formData.get('price'))
  };

  const response = await fetch('/api/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(book)
  });

  if (!response.ok) {
    const error = await response.json();
    ShowMessage(error.error || 'Could not add book.');
    return;
  }

  form.reset();
  await LoadBooks();
});

LoadBooks().catch(error => ShowMessage(error.message));
