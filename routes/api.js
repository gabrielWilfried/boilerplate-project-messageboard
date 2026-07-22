'use strict';

const crypto = require('crypto');

const boardsDB = {};

function makeId() {
  return crypto.randomBytes(12).toString('hex');
}

function getBoard(board) {
  if (!boardsDB[board]) {
    boardsDB[board] = [];
  }
  return boardsDB[board];
}

function sanitizeThread(thread, replyLimit) {
  const replies = replyLimit != null
    ? thread.replies.slice(-replyLimit)
    : thread.replies;

  return {
    _id: thread._id,
    text: thread.text,
    created_on: thread.created_on,
    bumped_on: thread.bumped_on,
    replies: replies.map(sanitizeReply)
  };
}

function sanitizeReply(reply) {
  return {
    _id: reply._id,
    text: reply.text,
    created_on: reply.created_on
  };
}

module.exports = function (app) {
  
  app.route('/api/threads/:board')
    // Create a new thread
    .post(function (req, res) {
      const board = req.params.board;
      const { text, delete_password } = req.body;

      const now = new Date();
      const thread = {
        _id: makeId(),
        text: text,
        created_on: now,
        bumped_on: now,
        reported: false,
        delete_password: delete_password,
        replies: []
      };

      getBoard(board).push(thread);

      return res.json(thread);
    })

    // View the 10 most recent threads, 3 replies each
    .get(function (req, res) {
      const board = req.params.board;
      const threads = getBoard(board)
        .slice()
        .sort((a, b) => b.bumped_on - a.bumped_on)
        .slice(0, 10)
        .map(t => sanitizeThread(t, 3));

      return res.json(threads);
    })

    // Report a thread
    .put(function (req, res) {
      const board = req.params.board;
      const { thread_id } = req.body;

      const thread = getBoard(board).find(t => t._id === thread_id);
      if (!thread) {
        return res.send('thread not found');
      }

      thread.reported = true;
      return res.send('reported');
    })

    // Delete a thread
    .delete(function (req, res) {
      const board = req.params.board;
      const { thread_id, delete_password } = req.body;

      const threads = getBoard(board);
      const thread = threads.find(t => t._id === thread_id);

      if (!thread) {
        return res.send('thread not found');
      }

      if (thread.delete_password !== delete_password) {
        return res.send('incorrect password');
      }

      const idx = threads.indexOf(thread);
      threads.splice(idx, 1);
      return res.send('success');
    });
    
  app.route('/api/replies/:board')
    // Create a new reply
    .post(function (req, res) {
      const board = req.params.board;
      const { text, delete_password, thread_id } = req.body;

      const thread = getBoard(board).find(t => t._id === thread_id);
      if (!thread) {
        return res.send('thread not found');
      }

      const now = new Date();
      const reply = {
        _id: makeId(),
        text: text,
        created_on: now,
        delete_password: delete_password,
        reported: false
      };

      thread.replies.push(reply);
      thread.bumped_on = now;

      return res.json(thread);
    })

    // View a single thread with all its replies
    .get(function (req, res) {
      const board = req.params.board;
      const { thread_id } = req.query;

      const thread = getBoard(board).find(t => t._id === thread_id);
      if (!thread) {
        return res.send('thread not found');
      }

      return res.json(sanitizeThread(thread, null));
    })

    // Report a reply
    .put(function (req, res) {
      const board = req.params.board;
      const { thread_id, reply_id } = req.body;

      const thread = getBoard(board).find(t => t._id === thread_id);
      if (!thread) {
        return res.send('thread not found');
      }

      const reply = thread.replies.find(r => r._id === reply_id);
      if (!reply) {
        return res.send('reply not found');
      }

      reply.reported = true;
      return res.send('reported');
    })

    // Delete a reply
    .delete(function (req, res) {
      const board = req.params.board;
      const { thread_id, reply_id, delete_password } = req.body;

      const thread = getBoard(board).find(t => t._id === thread_id);
      if (!thread) {
        return res.send('thread not found');
      }

      const reply = thread.replies.find(r => r._id === reply_id);
      if (!reply) {
        return res.send('reply not found');
      }

      if (reply.delete_password !== delete_password) {
        return res.send('incorrect password');
      }

      reply.text = '[deleted]';
      return res.send('success');
    });

};
