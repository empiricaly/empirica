import PropTypes from "prop-types";
import React, { Component } from "react";
import filteredMessages from "./utils/filteredMessagesHOC";

class Messages extends Component {
  constructor(props) {
    super(props);
    this.messagesEl = React.createRef();
    this.state = {
      messageLength: 0,
    };
  }

  componentDidMount() {
    this.messagesEl.current.scrollTop = this.messagesEl.current.scrollHeight;
    this.setState({ messageLength: this.props.messages.length });
  }

  componentDidUpdate() {
    const { messageLength } = this.state;
    const {
      messages: currentMessages,
      onIncomingMessage,
      customKey,
    } = this.props;

    if (
      this.messagesEl.current !== null &&
      currentMessages.length > messageLength
    ) {
      this.setState({ messageLength: currentMessages.length }, () => {
        if (onIncomingMessage) {
          onIncomingMessage(
            currentMessages.splice(this.state.messageLength),
            customKey
          );
        }

        this.messagesEl.current.scrollTop =
          this.messagesEl.current.scrollHeight;
      });
    }
  }

  render() {
    const { player, messages, messageComp: MessageComp, ...rest } = this.props;

    return (
      <div className="messages" ref={this.messagesEl}>
        {messages.length === 0 ? (
          <div className="empty">No messages yet...</div>
        ) : null}
        {messages.map((message) => {
          return <MessageComp message={message} player={player} {...rest} />;
        })}
      </div>
    );
  }
}

Messages.propTypes = {
  player: PropTypes.object,
  messageComp: PropTypes.elementType,
  filter: PropTypes.func,
  onIncomingMessage: PropTypes.func,
  hideAvatar: PropTypes.bool,
  hideName: PropTypes.bool,
  svgAvatar: PropTypes.bool,
  customKey: PropTypes.string,
};

export default filteredMessages(Messages);
