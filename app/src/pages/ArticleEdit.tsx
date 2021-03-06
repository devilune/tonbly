import { Button } from "@material-ui/core";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import gql from "graphql-tag";
import React, { useEffect, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { ArticleEditor } from "../components";
import { EditingArticle } from "../components/ArticleEditor";
import {
  Article_Tag_Insert_Input,
  Tag_Constraint,
  Tag_Update_Column,
  useGetArticleDetailForEditQuery,
  useUpdateArticleMutation
} from "../generated/graphql";

gql`
  query GetArticleDetailForEdit($id: Int!) {
    article(where: { id: { _eq: $id } }) {
      title
      content
      article_tags {
        tag {
          label
        }
      }
    }
  }
`;

gql`
  mutation UpdateArticle(
    $id: Int!
    $title: String!
    $content: String!
    $tags: [article_tag_insert_input!]!
  ) {
    update_article(
      where: { id: { _eq: $id } }
      _set: { title: $title, content: $content }
    ) {
      affected_rows
    }
    delete_article_tag(where: { article_id: { _eq: $id } }) {
      affected_rows
    }
    insert_article_tag(
      objects: $tags
      on_conflict: { constraint: article_tag_pkey, update_columns: [] }
    ) {
      affected_rows
    }
  }
`;

const useStyles = makeStyles((_: Theme) =>
  createStyles({
    editorFooter: {
      display: "flex",
      justifyContent: "flex-end",
      marginTop: "5px",
      "& button": {
        marginLeft: "5px",
        width: "120px"
      }
    }
  })
);

export const ArticleEdit = () => {
  const classes = useStyles();
  const id = Number(useParams<{ id: string }>().id);
  const history = useHistory();
  const [draft, setDraft] = useState({} as EditingArticle);
  const [updateArticle] = useUpdateArticleMutation();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);

  const { loading, error, data } = useGetArticleDetailForEditQuery({
    variables: { id }
  });

  useEffect(() => {
    if (titleInputRef && titleInputRef.current) {
      titleInputRef.current.focus();
    }

    if (editorRef?.current) {
      const codeMirror = editorRef?.current?.editorInst?.mdEditor?.cm;
      // FIXME: this setting does not work
      codeMirror.options.tabindex = 1;
    }
  }, []);

  const onDraftChange = (value: EditingArticle) => {
    setDraft(value);
  };

  const onCancelButtonClick = () => {
    history.replace(`/articles/${id}`);
  };

  const onUpdateButtonClidk: React.FormEventHandler = async e => {
    e.preventDefault();

    const tagsParam: Array<Article_Tag_Insert_Input> = draft.tags.map(
      label => ({
        article_id: id,
        tag: {
          data: { label: label },
          on_conflict: {
            constraint: Tag_Constraint.TagLabelKey,
            update_columns: [Tag_Update_Column.ForIgnoreUpdate]
          }
        }
      })
    );
    await updateArticle({
      variables: {
        id,
        title: draft.title,
        content: draft.content,
        tags: tagsParam
      }
    });
    history.replace(`/articles/${id}`);
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;
  if (!data || !data.article[0]) return <p>Data not found :(</p>;

  const article = data.article[0];
  const defaultValue: EditingArticle = {
    title: article.title,
    tags: article.article_tags.map(t => t.tag.label),
    content: article.content
  };

  return (
    <form
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        margin: "5px"
      }}
    >
      <ArticleEditor defaultValue={defaultValue} onChange={onDraftChange} />
      <div className={classes.editorFooter}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={onCancelButtonClick}
        >
          キャンセル
        </Button>
        <Button variant="outlined" color="secondary">
          下書き保存
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={onUpdateButtonClidk}
        >
          更新する
        </Button>
      </div>
    </form>
  );
};
