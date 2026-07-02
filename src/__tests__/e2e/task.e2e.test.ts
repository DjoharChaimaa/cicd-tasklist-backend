import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { vi } from "vitest";
import testPrisma from "./setup.js";

// Mock the prisma singleton to use the test client
vi.mock("../../lib/prisma.js", () => ({
	default: testPrisma,
}));

// Import app AFTER mocking prisma
const { default: app } = await import("../../app.js");
import request from "supertest";

describe("Task API E2E Tests", () => {
	beforeEach(async () => {
		// Clean up database between tests
		await testPrisma.task.deleteMany();
	});

	afterAll(async () => {
		await testPrisma.$disconnect();
	});

	describe("POST /api/tasks", () => {
		it("should create a new task", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "E2E Task", description: "E2E Description" });

			expect(res.status).toBe(201);
			expect(res.body).toHaveProperty("id");
			expect(res.body.title).toBe("E2E Task");
			expect(res.body.description).toBe("E2E Description");
			expect(res.body.completed).toBe(false);
		});

		it("should create task without description", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "Task without description" });

			expect(res.status).toBe(201);
			expect(res.body.title).toBe("Task without description");
		});

		it("should return 400 when title is missing", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ description: "No title" });

			expect(res.status).toBe(400);
			expect(res.body.error).toBeDefined();
		});

		it("should return 400 when title is empty", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "   " });

			expect(res.status).toBe(400);
			expect(res.body.error).toBeDefined();
		});
	});

	describe("GET /api/tasks", () => {
		it("should return all tasks", async () => {
			// Create two tasks
			await request(app)
				.post("/api/tasks")
				.send({ title: "Task 1" });

			await request(app)
				.post("/api/tasks")
				.send({ title: "Task 2" });

			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(Array.isArray(res.body)).toBe(true);
			expect(res.body.length).toBe(2);
		});

		it("should return empty array when no tasks exist", async () => {
			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(Array.isArray(res.body)).toBe(true);
			expect(res.body.length).toBe(0);
		});

		it("should return tasks ordered by createdAt desc", async () => {
			const task1 = await request(app)
				.post("/api/tasks")
				.send({ title: "Task 1" });

			// Add a small delay to ensure different timestamps
			await new Promise(resolve => setTimeout(resolve, 10));

			const task2 = await request(app)
				.post("/api/tasks")
				.send({ title: "Task 2" });

			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(res.body[0].id).toBe(task2.body.id);
			expect(res.body[1].id).toBe(task1.body.id);
		});
	});

	describe("GET /api/tasks/:id", () => {
		it("should return a single task by id", async () => {
			const createRes = await request(app)
				.post("/api/tasks")
				.send({ title: "Test Task" });

			const taskId = createRes.body.id;

			const res = await request(app).get(`/api/tasks/${taskId}`);

			expect(res.status).toBe(200);
			expect(res.body.id).toBe(taskId);
			expect(res.body.title).toBe("Test Task");
		});

		it("should return 404 when task does not exist", async () => {
			const res = await request(app).get("/api/tasks/999");

			expect(res.status).toBe(404);
			expect(res.body.error).toBeDefined();
		});

		it("should return 400 when id is invalid", async () => {
			const res = await request(app).get("/api/tasks/invalid");

			expect(res.status).toBe(400);
			expect(res.body.error).toBeDefined();
		});
	});

	describe("PUT /api/tasks/:id", () => {
		it("should update task title and description", async () => {
			const createRes = await request(app)
				.post("/api/tasks")
				.send({ title: "Original Title", description: "Original Description" });

			const taskId = createRes.body.id;

			const updateRes = await request(app)
				.put(`/api/tasks/${taskId}`)
				.send({ title: "Updated Title", description: "Updated Description" });

			expect(updateRes.status).toBe(200);
			expect(updateRes.body.title).toBe("Updated Title");
			expect(updateRes.body.description).toBe("Updated Description");
		});

		it("should update only title", async () => {
			const createRes = await request(app)
				.post("/api/tasks")
				.send({ title: "Original Title", description: "Description" });

			const taskId = createRes.body.id;

			const updateRes = await request(app)
				.put(`/api/tasks/${taskId}`)
				.send({ title: "Updated Title" });

			expect(updateRes.status).toBe(200);
			expect(updateRes.body.title).toBe("Updated Title");
		});

		it("should update task completed status", async () => {
			const createRes = await request(app)
				.post("/api/tasks")
				.send({ title: "Task" });

			const taskId = createRes.body.id;

			const updateRes = await request(app)
				.put(`/api/tasks/${taskId}`)
				.send({ completed: true });

			expect(updateRes.status).toBe(200);
			expect(updateRes.body.completed).toBe(true);
		});

		it("should return 404 when task does not exist", async () => {
			const res = await request(app)
				.put("/api/tasks/999")
				.send({ title: "Updated" });

			expect(res.status).toBe(404);
			expect(res.body.error).toBeDefined();
		});

		it("should return 400 when id is invalid", async () => {
			const res = await request(app)
				.put("/api/tasks/invalid")
				.send({ title: "Updated" });

			expect(res.status).toBe(400);
			expect(res.body.error).toBeDefined();
		});
	});

	describe("DELETE /api/tasks/:id", () => {
		it("should delete a task", async () => {
			const createRes = await request(app)
				.post("/api/tasks")
				.send({ title: "Task to delete" });

			const taskId = createRes.body.id;

			const deleteRes = await request(app).delete(`/api/tasks/${taskId}`);

			expect(deleteRes.status).toBe(204);

			// Verify task is deleted
			const getRes = await request(app).get(`/api/tasks/${taskId}`);
			expect(getRes.status).toBe(404);
		});

		it("should return 404 when task does not exist", async () => {
			const res = await request(app).delete("/api/tasks/999");

			expect(res.status).toBe(404);
			expect(res.body.error).toBeDefined();
		});

		it("should return 400 when id is invalid", async () => {
			const res = await request(app).delete("/api/tasks/invalid");

			expect(res.status).toBe(400);
			expect(res.body.error).toBeDefined();
		});
	});
});
