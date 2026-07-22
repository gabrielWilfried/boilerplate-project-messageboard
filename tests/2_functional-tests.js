const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
    this.timeout(10000);

  const board = 'test-board';
  let threadId, replyId;

  test('Creating a new thread: POST request to /api/threads/{board}', function (done) {
    chai
      .request(server)
      .post(`/api/threads/${board}`)
      .send({ text: 'Test thread', delete_password: 'pass123' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, '_id');
        assert.property(res.body, 'text');
        assert.property(res.body, 'created_on');
        assert.property(res.body, 'bumped_on');
        assert.property(res.body, 'reported');
        assert.property(res.body, 'delete_password');
        assert.property(res.body, 'replies');
        assert.isArray(res.body.replies);

        threadId = res.body._id; // save for later tests
        done();
      });
  });

  test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function (done) {
    chai
      .request(server)
      .get(`/api/threads/${board}`)
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAtMost(res.body.length, 10);

        if (res.body.length > 0) {
          const thread = res.body[0];
          assert.property(thread, '_id');
          assert.property(thread, 'text');
          assert.property(thread, 'created_on');
          assert.property(thread, 'bumped_on');
          assert.property(thread, 'replies');
          assert.notProperty(thread, 'reported');
          assert.notProperty(thread, 'delete_password');
          assert.isAtMost(thread.replies.length, 3);
        }
        done();
      });
  });

  test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board}', function (done) {
    chai
      .request(server)
      .delete(`/api/threads/${board}`)
      .send({ thread_id: threadId, delete_password: 'wrongpass' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Reporting a thread: PUT request to /api/threads/{board}', function (done) {
    chai
      .request(server)
      .put(`/api/threads/${board}`)
      .send({ thread_id: threadId })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('Creating a new reply: POST request to /api/replies/{board}', function (done) {
    chai
      .request(server)
      .post(`/api/replies/${board}`)
      .send({
        text: 'Test reply',
        delete_password: 'replypass',
        thread_id: threadId
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, 'replies');
        assert.isArray(res.body.replies);
        assert.isAtLeast(res.body.replies.length, 1);

        const reply = res.body.replies[res.body.replies.length - 1];
        assert.property(reply, '_id');
        assert.property(reply, 'text');
        assert.property(reply, 'created_on');
        assert.property(reply, 'delete_password');
        assert.property(reply, 'reported');

        replyId = reply._id; // save for later tests
        done();
      });
  });

  test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function (done) {
    chai
      .request(server)
      .get(`/api/replies/${board}`)
      .query({ thread_id: threadId })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, '_id');
        assert.property(res.body, 'text');
        assert.property(res.body, 'replies');
        assert.isArray(res.body.replies);
        assert.notProperty(res.body, 'reported');
        assert.notProperty(res.body, 'delete_password');

        if (res.body.replies.length > 0) {
          assert.notProperty(res.body.replies[0], 'reported');
          assert.notProperty(res.body.replies[0], 'delete_password');
        }
        done();
      });
  });

  test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board}', function (done) {
    chai
      .request(server)
      .delete(`/api/replies/${board}`)
      .send({
        thread_id: threadId,
        reply_id: replyId,
        delete_password: 'wrongpass'
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Reporting a reply: PUT request to /api/replies/{board}', function (done) {
    chai
      .request(server)
      .put(`/api/replies/${board}`)
      .send({ thread_id: threadId, reply_id: replyId })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('Deleting a reply with the correct password: DELETE request to /api/replies/{board}', function (done) {
    chai
      .request(server)
      .delete(`/api/replies/${board}`)
      .send({
        thread_id: threadId,
        reply_id: replyId,
        delete_password: 'replypass'
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('Deleting a thread with the correct password: DELETE request to /api/threads/{board}', function (done) {
    chai
      .request(server)
      .delete(`/api/threads/${board}`)
      .send({ thread_id: threadId, delete_password: 'pass123' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });
});
