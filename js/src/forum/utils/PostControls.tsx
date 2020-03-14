import { Vnode } from 'mithril';

// import EditPostComposer from '../components/EditPostComposer';
import Button from '../../common/components/Button';
import Separator from '../../common/components/Separator';
import ItemList from '../../common/utils/ItemList';
import Post from '../../common/models/Post';
import PostComponent from '../../forum/components/Post';

/**
 * The `PostControls` utility constructs a list of buttons for a post which
 * perform actions on it.
 */
export default {
    /**
     * Get a list of controls for a post.
     *
     * @param {Post} post
     * @param {*} context The parent component under which the controls menu will
     *     be displayed.
     * @public
     */
    controls(post: Post, context) {
        const items = new ItemList();

        ['user', 'moderation', 'destructive'].forEach(section => {
            const controls = this[section + 'Controls'](post, context).toArray();

            if (controls.length) {
                controls.forEach(item => items.add(item.itemName, item));
                items.add(section + 'Separator', Separator.component());
            }
        });

        return items;
    },

    /**
     * Get controls for a post pertaining to the current user (e.g. report).
     *
     * @param {Post} post
     * @param {*} context The parent component under which the controls menu will
     *     be displayed.
     * @protected
     */
    userControls(post: Post, context) {
        return new ItemList();
    },

    /**
     * Get controls for a post pertaining to moderation (e.g. edit).
     *
     * @param {Post} post
     * @param {*} context The parent component under which the controls menu will
     *     be displayed.
     * @protected
     */
    moderationControls(post: Post, context) {
        const items = new ItemList();

        if (post.contentType() === 'comment' && post.canEdit()) {
            if (!post.isHidden()) {
                items.add(
                    'edit',
                    Button.component(
                        {
                            icon: 'fas fa-pencil-alt',
                            onclick: this.editAction.bind(post),
                        },
                        app.translator.trans('core.forum.post_controls.edit_button')
                    )
                );
            }
        }

        return items;
    },

    /**
     * Get controls for a post that are destructive (e.g. delete).
     *
     * @param {Post} post
     * @param {*} context The parent component under which the controls menu will
     *     be displayed.
     * @protected
     */
    destructiveControls(post: Post, context) {
        const items = new ItemList();

        if (post.contentType() === 'comment' && !post.isHidden()) {
            if (post.canHide()) {
                items.add(
                    'hide',
                    Button.component({
                        icon: 'far fa-trash-alt',
                        children: app.translator.trans('core.forum.post_controls.delete_button'),
                        onclick: this.hideAction.bind(post),
                    })
                );
            }
        } else {
            if (post.contentType() === 'comment' && post.canHide()) {
                items.add(
                    'restore',
                    Button.component({
                        icon: 'fas fa-reply',
                        children: app.translator.trans('core.forum.post_controls.restore_button'),
                        onclick: this.restoreAction.bind(post),
                    })
                );
            }
            if (post.canDelete()) {
                items.add(
                    'delete',
                    Button.component({
                        icon: 'fas fa-times',
                        children: app.translator.trans('core.forum.post_controls.delete_forever_button'),
                        onclick: this.deleteAction.bind(post, context),
                    })
                );
            }
        }

        return items;
    },

    /**
     * Open the composer to edit a post.
     */
    editAction(this: Post) {
        return new Promise<EditPostComposer>(resolve => {
            const component = new EditPostComposer({ post: this });

            app.composer.load(component);
            app.composer.show();

            resolve(component);
        });
    },

    /**
     * Hide a post.
     */
    hideAction(this: Post) {
        this.pushAttributes({ hiddenAt: new Date(), hiddenUser: app.session.user });

        return this.save({ isHidden: true }).then(() => m.redraw());
    },

    /**
     * Restore a post.
     */
    restoreAction(this: Post) {
        this.pushAttributes({ hiddenAt: null, hiddenUser: null });

        return this.save({ isHidden: false }).then(() => m.redraw());
    },

    /**
     * Delete a post.
     */
    deleteAction(this: Post, context: PostComponent) {
        if (context) context.loading = true;

        return this.delete()
            .then(() => {
                const discussion = this.discussion();

                discussion.removePost(this.id());

                // If this was the last post in the discussion, then we will assume that
                // the whole discussion was deleted too.
                if (!discussion.postIds().length) {
                    // If there is a discussion list in the cache, remove this discussion.
                    if (app.cache.discussionList) {
                        app.cache.discussionList.removeDiscussion(discussion);
                    }

                    if (app.viewingDiscussion(discussion)) {
                        app.history.back();
                    }
                }
            })
            .catch(() => {})
            .then(() => {
                if (context) context.loading = false;
                m.redraw();
            });
    },
};