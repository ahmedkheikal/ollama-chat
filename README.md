# Chat SSE Server

A real-time chat application using Server-Sent Events (SSE) with Express.js backend and Reactjs for frontend.

## Features

- Real-time chat functionality using Server-Sent Events (SSE)
- Integration with LangChain for AI capabilities
- Selenium WebDriver support for automated testing

## Prerequisites

- Node.js (Latest LTS version recommended)
- npm (comes with Node.js)
- Chrome (for Selenium WebDriver)

## Project Structure

```
.
├── frontend/           # Frontend application
│   ├── public/        # Static files
│   └── src/           # Frontend source code
├── src/               # Backend source code
│   ├── server.js      # Main server file
│   └── index.js       # Alternative entry point
└── package.json       # Project dependencies and scripts
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd repo-name
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

## Running the Application

1. Start the backend server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

2. Start the frontend application:
```bash
cd frontend
npm start
```

## Available Scripts

- `npm start` - Start the backend server
- `npm run dev` - Start the backend server in development mode with auto-reload
- `npm run start-index` - Start the server using index.js as entry point

## Dependencies

### Backend
- express: ^4.18.2
- cors: ^2.8.5
- @langchain/community: ^0.0.20
- @langchain/core: ^0.1.17
- chromedriver: ^114.0.0
- selenium-webdriver: ^4.32.0

### Development Dependencies
- nodemon: ^3.0.2

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
