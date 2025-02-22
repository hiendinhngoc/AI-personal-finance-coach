# AI Personal Financial Coach

This project is an AI-powered personal financial coach application. It leverages modern web technologies and AI to provide users with personalized financial advice and tools.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Folder Structure](#folder-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

- User authentication and authorization
- Personalized financial advice using AI
- Interactive dashboard with financial insights
- Real-time data updates
- Responsive design

## Tech Stack

- **Frontend:**
  - React
  - TypeScript
  - Wouter (for routing)
  - Tailwind CSS
  - Radix UI
  - Tanstack React Query

- **Backend:**
  - Express
  - TypeScript
  - Vite
  - Drizzle ORM

- **AI:**
  - LangChain
  - OpenAI

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/yourusername/AI-personal-financial-coach.git
   cd AI-personal-financial-coach
   ```

2. Set up environment variables:

   Create a `.env` file in the root directory and add the following variables:

   ```properties
   DATABASE_URL=your_database_url
   SESSION_SECRET=your_session_secret
   PGDATABASE=your_database_name
   PGHOST=your_database_host
   PGPORT=your_database_port
   PGUSER=your_database_user
   PGPASSWORD=your_database_password
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

3. Install dependencies:

   ```sh
   npm install
   ```

4. Run the application:

   ```sh
   npm start
   ```

## Usage

Once the application is running, open your browser and navigate to `http://localhost:3000` to access the AI Personal Financial Coach.

## Folder Structure

The project structure is as follows:

```
AI-personal-financial-coach/
├── backend/                # Backend code
│   ├── src/
│   ├── tests/
│   └── package.json
├── frontend/               # Frontend code
│   ├── src/
│   ├── public/
│   └── package.json
├── .env                    # Environment variables
├── README.md               # Project documentation
└── package.json            # Project metadata and dependencies
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add some feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Open a pull request.

## License

This project is licensed under the MIT License.