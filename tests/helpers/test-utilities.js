/**
 * Test Utilities - Gabungan semua helper untuk testing
 *
 * Menggabungkan semua test utilities dalam satu file untuk kemudahan import
 */

const TestDataFactory = require('./TestDataFactory');
const TestAssertions = require('./TestAssertions');

/**
 * Test Environment - Helper untuk setup environment testing
 */
class TestEnvironment {
    /**
     * Setup environment sebelum test
     */
    static setup() {
        // Setup global test environment
        global.testEnvironment = {
            isTesting: true,
            timestamp: Date.now()
        };
    }

    /**
     * Cleanup environment setelah test
     */
    static cleanup() {
        if (global.testEnvironment) {
            delete global.testEnvironment;
        }
    }

    /**
     * Reset semua mocks dan spies
     */
    static reset() {
        jest.clearAllMocks();
        jest.resetAllMocks();
        jest.restoreAllMocks();
    }
}

/**
 * Mock Factory - Helper untuk membuat mock objects
 */
class MockFactory {
    /**
     * Buat mock storage manager
     */
    static createMockStorage() {
        return TestDataFactory.createMockStorage();
    }

    /**
     * Buat mock repository
     */
    static createMockRepository() {
        const mockRepo = {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            search: jest.fn()
        };
        return mockRepo;
    }

    /**
     * Buat mock service
     */
    static createMockService() {
        const mockService = {
            createTask: jest.fn(),
            getTask: jest.fn(),
            updateTask: jest.fn(),
            deleteTask: jest.fn(),
            getAllTasks: jest.fn()
        };
        return mockService;
    }

    /**
     * Buat mock request/response untuk controller testing
     */
    static createMockRequest(overrides = {}) {
        return {
            body: {},
            params: {},
            query: {},
            headers: {},
            ...overrides
        };
    }

    static createMockResponse() {
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
        return res;
    }
}

// Export semua utilities
module.exports = {
    TestDataFactory,
    TestAssertions,
    TestEnvironment,
    MockFactory
};
