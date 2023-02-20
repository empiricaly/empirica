import React, { Component } from "react";

export default class Footer extends Component {
  state = { comment: "", rows: 1, minRows: 1, maxRows: 5, buttonHeight: 30 };

  handleSubmit = (e) => {
    e.preventDefault();
    const text = this.state.comment.trim();
    if (text === "") {
      return;
    }

    const { player, onNewMessage, timeStamp } = this.props;

    let msg = {
      text,
      player: {
        _id: player._id,
        avatar: player.get("avatar"),
        name: player.get("name") || player._id,
      },
    };

    if (timeStamp) {
      msg = { ...msg, timeStamp };
    }

    onNewMessage(msg);

    this.setState({ comment: "" });
  };

  handleChange = (e) => {
    const el = e.currentTarget;
    const textareaLineHeight = 24;
    const { minRows, maxRows } = this.state;

    const previousRows = e.target.rows;
    e.target.rows = minRows; // reset number of rows in textarea
    // eslint-disable-next-line no-bitwise
    const currentRows = ~~(e.target.scrollHeight / textareaLineHeight);

    if (currentRows === previousRows) {
      e.target.rows = currentRows;
    }

    if (currentRows >= maxRows) {
      e.target.rows = maxRows;
      e.target.scrollTop = e.target.scrollHeight;
    }

    const usedRows = currentRows < maxRows ? currentRows : maxRows;

    this.setState(
      {
        [el.name]: el.value,
        rows: usedRows,
      },
      () => {
        this.setState({
          buttonHeight: document.getElementById("chat-input").offsetHeight,
        });
      }
    );
  };

  render() {
    const { comment, rows, buttonHeight } = this.state;

    return (
      <form onSubmit={this.handleSubmit}>
        <div className="chat-footer">
          <textarea
            id="chat-input"
            name="comment"
            className="chat-input"
            placeholder="Enter chat message"
            value={comment}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                this.handleSubmit(e);
              }
            }}
            rows={rows}
            onChange={this.handleChange}
            autoComplete="off"
          />
          <button
            type="submit"
            style={{ height: buttonHeight }}
            className="chat-button-send"
            disabled={!comment}
          >
            Send
          </button>
        </div>
      </form>
    );
  }
}

// Footer.propTypes = {
//   player: PropTypes.object.isRequired,
//   scope: PropTypes.object.isRequired,
//   customKey: PropTypes.string.isRequired,
//   onNewMessage: PropTypes.func,
//   timeStamp: PropTypes.instanceOf(Date),
// };
