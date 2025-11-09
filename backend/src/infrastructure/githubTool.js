import { Tool, ToolResult } from '../domain/tools.js';

export class GitHubTool extends Tool {
    constructor() {
        super(
            'github',
            'Interact with GitHub API to read repository and user information'
        );
        this.baseUrl = 'https://api.github.com';
        this.registerActions();
    }

    registerActions() {
        // Register read_repos action
        this.registerAction(
            'read_repos',
            'Read all repositories for a GitHub user or organization',
            {
                type: 'object',
                properties: {
                    username: {
                        type: 'string',
                        description: 'GitHub username or organization name'
                    },
                    type: {
                        type: 'string',
                        enum: ['all', 'owner', 'member'],
                        description: 'Filter repositories by type. Default: all',
                        default: 'all'
                    },
                    sort: {
                        type: 'string',
                        enum: ['created', 'updated', 'pushed', 'full_name'],
                        description: 'Sort repositories by. Default: full_name',
                        default: 'full_name'
                    },
                    direction: {
                        type: 'string',
                        enum: ['asc', 'desc'],
                        description: 'Sort direction. Default: desc',
                        default: 'desc'
                    },
                    per_page: {
                        type: 'number',
                        description: 'Number of results per page. Default: 30, max: 100',
                        default: 30,
                        minimum: 1,
                        maximum: 100
                    },
                    page: {
                        type: 'number',
                        description: 'Page number. Default: 1',
                        default: 1,
                        minimum: 1
                    }
                },
                required: ['username']
            },
            async (params) => {
                try {
                    const { username, type = 'all', sort = 'full_name', direction = 'desc', per_page = 30, page = 1 } = params;
                    
                    const queryParams = new URLSearchParams({
                        type,
                        sort,
                        direction,
                        per_page: per_page.toString(),
                        page: page.toString()
                    });

                    const url = `${this.baseUrl}/users/${encodeURIComponent(username)}/repos?${queryParams}`;
                    const response = await fetch(url, {
                        headers: {
                            'Accept': 'application/vnd.github.v3+json',
                            'User-Agent': 'ollama-chat'
                        }
                    });

                    if (!response.ok) {
                        if (response.status === 404) {
                            return ToolResult.error(`User or organization '${username}' not found`);
                        }
                        const errorText = await response.text();
                        return ToolResult.error(`GitHub API error: ${response.status} - ${errorText}`);
                    }

                    const repos = await response.json();
                    
                    return ToolResult.success({
                        username,
                        total_repos: repos.length,
                        repositories: repos.map(repo => ({
                            name: repo.name,
                            full_name: repo.full_name,
                            description: repo.description,
                            url: repo.html_url,
                            language: repo.language,
                            stars: repo.stargazers_count,
                            forks: repo.forks_count,
                            is_private: repo.private,
                            created_at: repo.created_at,
                            updated_at: repo.updated_at,
                            pushed_at: repo.pushed_at
                        }))
                    });
                } catch (error) {
                    return ToolResult.error(`Failed to fetch repositories: ${error.message}`);
                }
            },
            (params) => {
                if (!params.username || typeof params.username !== 'string') {
                    return false;
                }
                if (params.username.trim().length === 0) {
                    return false;
                }
                return true;
            }
        );

        // Register read_user_info action
        this.registerAction(
            'read_user_info',
            'Read information about a GitHub user or organization',
            {
                type: 'object',
                properties: {
                    username: {
                        type: 'string',
                        description: 'GitHub username or organization name'
                    }
                },
                required: ['username']
            },
            async (params) => {
                try {
                    const { username } = params;
                    
                    const url = `${this.baseUrl}/users/${encodeURIComponent(username)}`;
                    const response = await fetch(url, {
                        headers: {
                            'Accept': 'application/vnd.github.v3+json',
                            'User-Agent': 'ollama-chat'
                        }
                    });

                    if (!response.ok) {
                        if (response.status === 404) {
                            return ToolResult.error(`User or organization '${username}' not found`);
                        }
                        const errorText = await response.text();
                        return ToolResult.error(`GitHub API error: ${response.status} - ${errorText}`);
                    }

                    const user = await response.json();
                    
                    return ToolResult.success({
                        username: user.login,
                        name: user.name,
                        bio: user.bio,
                        company: user.company,
                        location: user.location,
                        email: user.email,
                        blog: user.blog,
                        type: user.type, // User or Organization
                        public_repos: user.public_repos,
                        public_gists: user.public_gists,
                        followers: user.followers,
                        following: user.following,
                        created_at: user.created_at,
                        updated_at: user.updated_at,
                        url: user.html_url,
                        avatar_url: user.avatar_url
                    });
                } catch (error) {
                    return ToolResult.error(`Failed to fetch user info: ${error.message}`);
                }
            },
            (params) => {
                if (!params.username || typeof params.username !== 'string') {
                    return false;
                }
                if (params.username.trim().length === 0) {
                    return false;
                }
                return true;
            }
        );
    }
}

export default GitHubTool;

